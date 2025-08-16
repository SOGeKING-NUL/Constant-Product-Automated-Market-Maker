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
        uint256 token0ExchangeRate,
        uint256 token1ExchangeRate 
    );
    function addLiquidity(uint256 _reserveAdded0, uint256 _reserveAdded1)external returns (uint256 shares);
    function removeLiquidity(uint256 _shares) external returns (uint256 reserveRemoved0, uint256 reserveRemoved1);
    function getSwapEstimate(address _tokenIn, uint256 _amountIn) external view returns (uint256 amountOut);
    function swap(address _tokenIn, uint256 _amountIn) external returns(uint256 amountOut);
    function getLPTokenAddress() external view returns (address);
}

interface ILPToken{
    function approve(address spender, uint256 amount) external returns(bool);
    function totalSupply() external view returns(uint256);
    function balanceOf(address account) external view returns(uint256);
}

contract CPAMMVault is ERC4626, ReentrancyGuard{

    using SafeERC20 for IERC20;
    ICPAMM public immutable amm;
    IERC20 public immutable lpToken;
    IERC20 public immutable token0; // WETH
    IERC20 public immutable token1; // USDC (Vault asset)

    uint256 slippageBps= 100; // 1% slippage

    address t0;
    address t1;
    uint256 reserve0;
    uint256 reserve1;
    uint256 ratio;
    uint256 totalLPSupply;
    uint256 token0ExchangeRate;
    uint256 token1ExchangeRate;

    constructor(address _amm) ERC4626(IERC20(_getToken1(_amm))) ERC20("CPAMM Vault USDC", "vUSDC"){
            amm= ICPAMM(_amm);
            (t0, t1, reserve0, reserve1, ratio, totalLPSupply, token0ExchangeRate, token1ExchangeRate)= amm.getPoolState();
            token0 = IERC20(t0);
            token1 = IERC20(t1);
            lpToken= IERC20(amm.getLPTokenAddress());

            //approvals to use all tokens to the AMM 
            token0.safeApprove(_amm, type(uint256).max);
            token1.safeApprove(_amm, type(uint256).max);
            lpToken.safeApprove(_amm, type(uint256).max);
    }

    function totalAssets() public view virtual override returns (uint256) {
        uint256 lpBalance = lpToken.balanceOf(address(this));   

        if (lpBalance == 0) {
            return 0; // vault does not hold any assets
        }

        uint256 totalVaultShares= (lpBalance * 1e18)/totalLPSupply; //total shares in the vault
        uint256 t0ProRataAmount= reserve0 * totalVaultShares / 1e18; //total weth vault has scaled to 18 decimals for calculation
        uint256 t1ProRataAmount=  reserve1 * totalVaultShares / 1e18; //total usdc vault has scaled to 18 decimals for calculation
        uint256 t0Value= t0ProRataAmount * token0ExchangeRate / 1e18; //value of weth in usdc

        return t1ProRataAmount + t0Value; //total value of the vault in USDC (usdc amount + weth value in usdc)
    }

    function deposit(uint256 assests, address reciever) public override nonReentrant returns(uint256 shares){
        require (msg.value >0, "Deposit amount must be greater than 0"); 
        asset().safeTransferFrom(msg.sender, address(this), msg.value); //transfer USDC from user to vault using the ERC4626 asset function
        _addLiquidityToLPInUSDC(assests); //adds USDC to be added to the AMM
        shares = previewDeposit(assests); //the ERC4626 function tells you how many shares the vault will mint for you if the deposit is successful
        _mint(reciever, shares); //mint the shares to the reciever since deposit was successful in the _addLiquidityToLPInUSDC fucntion call
        emit Deposit(msg.sender, reciever, assests, shares); //emit the deposit event, already defined in the IERC4626         
    }

    function withdraw(uint256 assets, address reciever, address owner) public override nonReentrant returns(uint256 shares){
        shares= previewWithdraw(assets); //returns amount of shares wthat will be burned to get the amount out
        if(msg.sender!= owner){
            _spendAllowance(owner, msg.spender, shares);
        }
        _burn(owner, shares);
        _removeLiquidityToUSDC(assets, reciever); //removes liquidity from the AMM and sends USDC to the reciever
        emit Withdraw(msg.sender, reciever, owner, assets, shares); //emit the withdraw event, already defined in the IERC4626
    }   

    function depositWithToken0() public{}
    
    function _getToken1(address _amm) internal view returns (address){
        (, address token_1, ,,,,,)= ICPAMM(_amm).getPoolState();
        return token_1;
    }


    //---------- INTERNAL FUNCTIONS ----------

    function _addLiquidityToLPInUSDC(uint256 usdcAmount) internal returns(uint256 shares){
        uint256 targetToken0Value = usdcAmount * 1e18/ ((1* 1e18) + token0ExchangeRate ); // amount of USDC to be swapped into WETH so that it can be added to LP, added ss to repo about the maths
        uint256 usdcToSwap= targetToken0Value;
        uint256 minToken0Out= amm.getswapEstimate(address(token1), usdcToSwap)* ((10000 - slippageBps))/10000; //gets a min expected amount wiht 1% spliiage
        uint256 token0Out= amm.swap(address(token1), usdcToSwap); //swap USDC for WETH
        require(token0Out >= minToken0Out, "Slippage too high"); //check if the swap was successful and the slippage is within limits
        uint256 token1Remaining= usdcAmount -usdcToSwap;
        amm.addLiquidity(token0Out, token1Remaining); //add liquidity to the AMM
    }

    function _removeLiquidityToUSDC(uint256 assets, address receiver) internal{
        uint256 totalAssetsStored= totalAssets();
        uint256 lpBal= lpToken.balanceOf(address(this)); //get the amount of LP tokens held by the vault
        uint256 lpTokensToRemove= (assets * lpBal) / totalAssetsStored; //calculate how many LP tokens to remove based on the assets requested and the total assets in the vault

        (uint256 amt0, uint256 amt1)= amm.removeLiquidity(lpTokensToRemove); //remove liquidity from the AMM, returns the amount of WETH and USDC removed

        if(amt0 >0){
            uint256 minToken1Out = (amm.getSwapEstimate(address(token0), amt0) * (10000- slippageBps))/10000; //get the min expected amount of USDC to be swapped for WETH with 1% slippage
            uint256 token1Out = amm.swap(address(token0), amt0); //swap WETH for USDC
            require(token1Out >= minToken1Out, "Slippage too high"); //check if the swap was successful and the slippage is within limits
            amt1 += token1Out; //add the swapped USDC to the amount of USDC removed from the AMM
        }

        token1.safeTransfer(receiver, amt1);
    }