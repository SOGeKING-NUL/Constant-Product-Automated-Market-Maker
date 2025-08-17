// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface ICPAMM {
    function getPoolState() external view returns (
        address token0Address,
        address token1Address,
        uint256 reserve_0,
        uint256 reserve_1,
        uint256 ratio,
        uint256 totalLPSupply,
        uint256 token0ExchangeRate, // Price of token0 in token1 (USDC per WETH)
        uint256 token1ExchangeRate  // Price of token1 in token0 (WETH per USDC)
    );
    function addLiquidity(uint256 _reserveAdded0, uint256 _reserveAdded1) external returns (uint256 shares);
    function removeLiquidity(uint256 _shares) external returns (uint256 reserveRemoved0, uint256 reserveRemoved1);
    function getSwapEstimate(address _tokenIn, uint256 _amountIn) external view returns (uint256 amountOut);
    function swap(address _tokenIn, uint256 _amountIn) external returns(uint256 amountOut);
    function getLPTokenAddress() external view returns (address);
}

interface ILPToken {
    function balanceOf(address account) external view returns(uint256);
}

contract CPAMMVault is ERC4626, ReentrancyGuard {

    using SafeERC20 for IERC20;

    ICPAMM public immutable amm; 
    IERC20 public immutable lpToken; 
    IERC20 public immutable token0;
    IERC20 public immutable token1; 

    uint256 public slippageBps = 100; // 1% slippage basis points (100 / 10000)

    constructor(address _amm) ERC4626(IERC20(_getAMMToken1Address(_amm))) ERC20("CPAMM Vault USDC Shares", "vUSDC"){
        amm = ICPAMM(_amm);

        (address t0_address, address t1_address, , , , , , ) = amm.getPoolState();
        token0 = IERC20(t0_address);
        token1 = IERC20(t1_address);

        lpToken = IERC20(amm.getLPTokenAddress()); // Get the LP token address

        token0.forceApprove(_amm, type(uint256).max);
        token1.forceApprove(_amm, type(uint256).max);
        lpToken.forceApprove(_amm, type(uint256).max);
    }

    function totalAssets() public view override returns (uint256) {
        uint256 lpBalance = lpToken.balanceOf(address(this)); // Get the amount of LP tokens held by the vault

        // If the vault holds no LP tokens, it has no assets
        if (lpBalance == 0) {
            return 0;
        }
        (, , uint256 currentReserve0, uint256 currentReserve1, , uint256 currentTotalLPSupply, uint256 currentToken0ExchangeRate, ) = amm.getPoolState();

        // If AMM has no liquidity or currentTotalLPSupply is zero, return 0 to prevent division by zero
        if (currentTotalLPSupply == 0 || currentReserve0 == 0 || currentReserve1 == 0) {
            return 0;
        }

        // Calculate the vault's proportional share of each reserve
        // lpBalance / currentTotalLPSupply gives the vault's share of the total pool
        uint256 token0ProRataAmount = (lpBalance * currentReserve0) / currentTotalLPSupply;
        uint256 token1ProRataAmount = (lpBalance * currentReserve1) / currentTotalLPSupply;

        // Convert the token0 amount to its equivalent value in token1 (USDC) using the current exchange rate
        // Assuming token0ExchangeRate is scaled by 1e18 as per AMM's getPoolState
        uint256 token0ValueInToken1 = (token0ProRataAmount * currentToken0ExchangeRate) / 1e18;

        // Total value of the vault's assets in token1 (USDC)
        return token1ProRataAmount + token0ValueInToken1;
    }

    function deposit(uint256 assets, address receiver) public override nonReentrant returns (uint256 shares) {
        require(assets > 0, "Deposit amount must be greater than 0");

        // Calculate shares BEFORE transferring assets and adding liquidity to get correct pricing
        shares = previewDeposit(assets);
        
        IERC20(asset()).safeTransferFrom(msg.sender, address(this), assets);
        _addLiquidityToAMM(assets);
        
        _mint(receiver, shares);

        emit Deposit(msg.sender, receiver, assets, shares);
        return shares;
    }

    function withdraw(uint256 assets, address receiver, address owner) public override nonReentrant returns(uint256 shares){
        shares = previewWithdraw(assets); //returns amount of shares that will be burned to get the amount out
        if(msg.sender != owner){
            _spendAllowance(owner, msg.sender, shares);
        }
        _burn(owner, shares);
        _removeLiquidityFromAMM(assets, receiver); //removes liquidity from the AMM and sends USDC to the receiver
        emit Withdraw(msg.sender, receiver, owner, assets, shares); //emit the withdraw event, already defined in the IERC4626
        return shares;
    }

    //---------- INTERNAL HELPERS ----------

    function _getAMMToken1Address(address _amm) internal view returns (address) {
        (, address token_1, , , , , , ) = ICPAMM(_amm).getPoolState();
        return token_1;
    }

    function _addLiquidityToAMM(uint256 usdcAmount) internal returns(uint256 shares){
        (, , uint256 currentReserve0, uint256 currentReserve1, , , , ) = amm.getPoolState();
        require(currentReserve0 > 0 && currentReserve1 > 0, "AMM: Pool is unbalanced or drained, cannot add liquidity proportionally.");

        uint256 usdcToSwap =  (usdcAmount * currentReserve0) / (currentReserve0 + currentReserve1); // amount of USDC to be swapped into WETH so that it can be added to LP

        uint256 minToken0Out = amm.getSwapEstimate(address(token1), usdcToSwap) * (10000 - slippageBps) / 10000; //gets a min expected amount with 1% slippage
        uint256 token0Out = amm.swap(address(token1), usdcToSwap); //swap USDC for WETH
        require(token0Out >= minToken0Out, "Slippage too high"); //check if the swap was successful and the slippage is within limits
        uint256 token1Remaining = usdcAmount - usdcToSwap;
        shares = amm.addLiquidity(token0Out, token1Remaining); //add liquidity to the AMM
        return shares;
    }

    function _removeLiquidityFromAMM(uint256 assets, address receiver) internal{
        (, , uint256 currentReserve0, uint256 currentReserve1, , , , ) = amm.getPoolState();
        require(currentReserve0 > 0 && currentReserve1 > 0, "AMM: Pool is unbalanced or drained, cannot remove liquidity proportionally.");

        uint256 totalAssetsStored = totalAssets();
        uint256 lpBal = lpToken.balanceOf(address(this)); //get the amount of LP tokens held by the vault
        require(totalAssetsStored > 0 && lpBal > 0, "Vault: Empty");

        // calculate how many LP tokens to remove based on the assets requested and the total assets in the vault
        // totalAssetsStored - 1 for round up, else it will round down use to integer division and give less assets than requested
        uint256 lpTokensToRemove = (assets * lpBal + (totalAssetsStored - 1)) / totalAssetsStored;

        (uint256 amt0, uint256 amt1) = amm.removeLiquidity(lpTokensToRemove); //remove liquidity from the AMM, returns the amount of WETH and USDC removed

        if(amt0 > 0){
            uint256 minToken1Out = (amm.getSwapEstimate(address(token0), amt0) * (10000 - slippageBps)) / 10000; //get the min expected amount of USDC to be swapped for WETH with 1% slippage
            uint256 token1Out = amm.swap(address(token0), amt0); //swap WETH for USDC
            require(token1Out >= minToken1Out, "Slippage too high"); //check if the swap was successful and the slippage is within limits
            amt1 += token1Out; //add the swapped USDC to the amount of USDC removed from the AMM
        }

        // enforce ERC-4626 exactness: transfer exactly `assets` or revert
        require(amt1 >= assets, "Vault: Insufficient out");

        token1.safeTransfer(receiver, assets);

        // any surplus (amt1 - assets) remains in the vault and accrues to remaining depositors
    }

    //---------- ADDITIONAL FUNCTIONS FOR BETTER ERC4626 COMPLIANCE ----------

    function redeem(uint256 shares, address receiver, address owner) public override nonReentrant returns (uint256 assets) {
        if (msg.sender != owner) {
            _spendAllowance(owner, msg.sender, shares);
        }
        
        assets = previewRedeem(shares);
        _burn(owner, shares);
        _removeLiquidityFromAMM(assets, receiver);
        
        emit Withdraw(msg.sender, receiver, owner, assets, shares);
        return assets;
    }

    function mint(uint256 shares, address receiver) public override nonReentrant returns (uint256 assets) {
        assets = previewMint(shares);
        
        IERC20(asset()).safeTransferFrom(msg.sender, address(this), assets);
        _addLiquidityToAMM(assets);
        _mint(receiver, shares);
        
        emit Deposit(msg.sender, receiver, assets, shares);
        return assets;
    }

    //---------- GETTERS (helpers) ----------

    function getAMM() external view returns (address) {
        return address(amm);
    }

    function getLPTokenBalance() external view returns(uint256){
        return lpToken.balanceOf(address(this));
    }

    function getTotalShares() external view returns(uint256){
       return totalSupply();// from the ERC20 vUSDC contract
    }

    function getUserShares(address user) external view returns (uint256) {
        return balanceOf(user);
    }

    function getUserAssetBalance(address user) external view returns (uint256) {
        return convertToAssets(balanceOf(user)); //convertToAssets is from ERC4626 and returns the amount of assets (USDC) for a given amount of shares
    }

    function getTotalAssetsManaged() external view returns (uint256) {
        return totalAssets();
    }

    // Current exchange rate: how many assets per 1 vUSDC share
    function getPricePerShare() external view returns (uint256) {
        uint256 supply = totalSupply();
        return supply == 0 ? 0 : (totalAssets() * 1e18) / supply;
    }

    function getLPToken() external view returns (address) {
        return address(lpToken);
    }

    function getToken0() external view returns (address) {
        return address(token0);
    }

    function getToken1() external view returns (address) {
        return address(token1);
    }

    function getSlippageBps() external view returns (uint256) {
        return slippageBps;
    }
}
