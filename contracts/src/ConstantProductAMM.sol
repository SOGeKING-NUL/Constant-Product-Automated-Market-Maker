// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./LPToken.sol";

contract ConstantProductAutomatedMarketMaker is ReentrancyGuard{

    //events
    event LiquidityAdded(address indexed provider, uint256 shares);
    event LiquidityRemoved(address indexed provider, uint256 shares);
    event Swapped(address indexed user, address tokenIn, uint256 amountIn, address tokenOut, uint256 amountOut);
    event ReservesUpdated(uint256 reserve0, uint256 reserve1);

    IERC20 private immutable token0;
    IERC20 private immutable token1;
    LPToken public immutable lpToken;

    uint256 private reserve0;
    uint256 private reserve1;


    constructor(address _token0, address _token1){
        token0 = IERC20(_token0);   //WETH
        token1 = IERC20(_token1);   //USDC
        lpToken= new LPToken();

    }

    function addLiquidity(uint256 _reserveAdded0, uint256 _reserveAdded1) external nonReentrant returns (uint256 shares) {

        require(_reserveAdded0> 0 && _reserveAdded1 > 0, "AMM: Invalid reserve values");

        token0.transferFrom(msg.sender, address(this), _reserveAdded0);
        token1.transferFrom(msg.sender, address(this), _reserveAdded1);

        if(lpToken.totalSupply() == 0){
            shares= _sqrt(_reserveAdded0*_reserveAdded1); //AMM formula to get inital shares
        }
        else{
            require(reserve0 * _reserveAdded1 == reserve1 * _reserveAdded0, "Invalid ratio"); //maintain ratio
            shares= _min((_reserveAdded0*lpToken.totalSupply()) / reserve0,
                         (_reserveAdded1*lpToken.totalSupply()) / reserve1);
        }

        require(shares > 0, "AMM: Invalid shares");

        lpToken.mint(msg.sender, shares);
        _updateReserves();

        emit LiquidityAdded(msg.sender, shares);
        return shares;
    }

    function removeLiquidity(uint256 _shares) external nonReentrant returns (uint256 reserveRemoved0, uint256 reserveRemoved1){
        require(_shares > 0, "AMM: Invalid shares");
        require(lpToken.balanceOf(msg.sender) >= _shares, "AMM: Insufficient shares");

        uint256 balance0 = token0.balanceOf(address(this));
        uint256 balance1 = token1.balanceOf(address(this));
        reserveRemoved0= (_shares * balance0)/lpToken.totalSupply();
        reserveRemoved1= (_shares * balance1)/lpToken.totalSupply();

        require(reserveRemoved0 > 0 && reserveRemoved1 > 0, "AMM: Invalid reserves");

        lpToken.burn(msg.sender, _shares);

        token0.transfer(msg.sender, reserveRemoved0);
        token1.transfer(msg.sender, reserveRemoved1);

        _updateReserves();
        emit LiquidityRemoved(msg.sender, _shares);

        return (reserveRemoved0, reserveRemoved1);
    }

    function swap(address _tokenIn, uint256 _amountIn) external nonReentrant returns(uint256 amountOut){

        require(_tokenIn == address(token0) || _tokenIn == address(token1), "AMM: Token address invalid");
        require(_amountIn > 0, "AMM: Invalid amount");

        bool isToken0 = (_tokenIn == address(token0));

        (IERC20 tokenIn, IERC20 tokenOut, uint256 reserveIn, uint256 reserveOut)= isToken0 ? (token0, token1, reserve0, reserve1) : (token1, token0, reserve1, reserve0);

        tokenIn.transferFrom(msg.sender, address(this), _amountIn);
        uint256 _amountInWithFees= _amountIn *997/1000; //0.3 percent platform fees
        amountOut= (reserveOut * _amountInWithFees)/(reserveIn + _amountInWithFees);

        require(amountOut > 0, "AMM: Invalid amount out ");
        
        tokenOut.transfer(msg.sender, amountOut);

        _updateReserves();
        emit Swapped(msg.sender, _tokenIn, _amountIn, isToken0 ? address(token1) : address(token0), amountOut);

        return amountOut;
    }

    function _sqrt(uint256 x) internal pure returns(uint256 z){

        if(x==0)return 0; //redundant case
        else if(x==1)return 1; //redundant case

        else{
            z = x;
            uint256 y= x/2 + 1;
            while(y < z){
                z = y;
                y = ((x/y) + y)/2; //avg of x/y and y, exists loop when y becomes equal to z
            }
        }
    }

    function _min(uint256 x, uint256 y) internal pure returns(uint256){
        return x < y? x: y;
    }

    function _updateReserves() internal {
        reserve0 = token0.balanceOf(address(this));
        reserve1= token1.balanceOf(address(this));
        emit ReservesUpdated(reserve0, reserve1);
    }

    //getters

    function getSwapEstimate(address _tokenIn, uint256 _amountIn) external view returns (uint256 amountOut) 
    {
        require(_tokenIn == address(token0) || _tokenIn == address(token1), "AMM: Invalid token");
        require(_amountIn > 0, "AMM: Invalid amount");
        
        bool isToken0 = (_tokenIn == address(token0));
        (uint256 reserveIn, uint256 reserveOut) = isToken0 ? (reserve0, reserve1) : (reserve1, reserve0);
        uint256 amountInWithFee = (_amountIn * 997)/1000; //%0.3 fees
        
        amountOut = (reserveOut * amountInWithFee) / (reserveIn + amountInWithFee);
        
        return amountOut;
    }

    function getPoolRatio() external view returns (uint256 ratio, uint256 reserve_0, uint256 reserve_1) {
        reserve_0 = reserve0;
        reserve_1 = reserve1;
        
        if (reserve_0 == 0 || reserve_1 == 0) {
            ratio = 0; // No liquidity yet
        } else {
            // Ratio of token1 (USDC) per token0(WETH) (with 18 decimal precision)
            ratio = (reserve_1 * 1e18) / reserve_0;
        }
        
        return (ratio, reserve_0, reserve_1);
    }

    function getPoolState() external view returns (
        address token0Address,
        address token1Address,
        uint256 reserve_0,
        uint256 reserve_1,
        uint256 ratio,
        uint256 totalLPSupply,
        uint256 token0ExchangeRate,
        uint256 token1ExchangeRate 
    ) 
    {
        token0Address = address(token0);
        token1Address = address(token1);
        reserve_0 = reserve0;
        reserve_1 = reserve1;
        totalLPSupply = lpToken.totalSupply();
        
        if (reserve_0 > 0 && reserve_1 > 0) {
            ratio = (reserve_1 * 1e18) / reserve_0; // token1 per token0  basically follows (token0ExchangeRate * reserve0) == (token1ExchangeRate  * reserve1)
            token0ExchangeRate = (reserve_1 * 1e18) / reserve_0; // Price of token0 in token1
            token1ExchangeRate  = (reserve_0 * 1e18) / reserve_1; // Price of token1 in token0
        }
        
        return (token0Address, token1Address, reserve_0, reserve_1, ratio, totalLPSupply, token0ExchangeRate, token1ExchangeRate);
    }


}
