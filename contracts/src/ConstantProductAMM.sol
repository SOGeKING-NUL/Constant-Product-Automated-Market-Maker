// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract ConstantProductAutomatedMarketMaker is ReentrancyGuard{

    //events
    event LiquidityAdded(address indexed provider, uint256 shares);
    event LiquidityRemoved(address indexed provider, uint256 shares);
    event Swapped(address indexed user, address tokenIn, uint256 amountIn, address tokenOut, uint256 amountOut);
    event ReservesUpdated(uint256 reserve0, uint256 reserve1);

    IERC20 private immutable token0;
    IERC20 private immutable token1;

    uint256 private reserve0;
    uint256 private reserve1;

    uint256 private totalSupply;
    mapping (address=>uint256) private lpBalance;

    constructor(address _token0, address _token1){
        token0 = IERC20(_token0);
        token1 = IERC20(_token1);
    }

    function addLiquidity(uint256 _reserveAdded0, uint256 _reserveAdded1) external nonReentrant returns (uint256 shares) {

        require(_reserveAdded0> 0 && _reserveAdded1 > 0, "AMM: Invalid reserve values");

        token0.transferFrom(msg.sender, address(this), _reserveAdded0);
        token1.transferFrom(msg.sender, address(this), _reserveAdded1);

        if(totalSupply == 0){
            shares= _sqrt(_reserveAdded0*_reserveAdded1); //AMM formula to get inital shares
        }
        else{
            require(reserve0 * _reserveAdded1 == reserve1 * _reserveAdded0, "Invalid ratio"); //maintain ratio
            shares= _min((_reserveAdded0*totalSupply) / reserve0, (_reserveAdded1*totalSupply) / reserve1);
        }

        require(shares > 0, "AMM: Invalid shares");

        _mintShares(msg.sender, shares);
        _updateReserves();
        emit LiquidityAdded(msg.sender, shares);
        return shares;
    }

    function removeLiquidity(uint256 _shares) external nonReentrant returns (uint256 reserveRemoved0, uint256 reserveRemoved1){
        require(_shares > 0, "AMM: Invalid shares");
        require(lpBalance[msg.sender] >= _shares, "AMM: Insufficient shares");

        uint256 balance0 = token0.balanceOf(address(this));
        uint256 balance1 = token1.balanceOf(address(this));
        reserveRemoved0= (_shares * balance0)/totalSupply;
        reserveRemoved1= (_shares * balance1)/totalSupply;

        require(reserveRemoved0 > 0 && reserveRemoved1 > 0, "AMM: Invlaid reserves");
        _burnShares(msg.sender, _shares);

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
        amountOut= (reserveOut * _amountIn)/(reserveIn + _amountIn);

        require(amountOut > 0, "AMM: Invlaid amount out ");
        
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

    function _mintShares(address to, uint256 _shares) internal{
        lpBalance[to] += _shares;
        totalSupply += _shares;
    }

    function _burnShares(address from, uint256 _shares) internal{
        lpBalance[from] -= _shares;
        totalSupply -= _shares;
    }

    function _updateReserves() internal {
        reserve0 = token0.balanceOf(address(this));
        reserve1= token1.balanceOf(address(this));
        emit ReservesUpdated(reserve0, reserve1);
    }

    //getters

    function getAmountOut(address _tokenIn, uint256 _amountIn) external view returns(uint256 amountOut){
        require(_tokenIn== address(token0) || _tokenIn == address(token1), "AMM: Invalid token contract");
        require(_amountIn > 0, "AMM: Invalid token amount");

        bool isToken0 = (_tokenIn == address(token0));
        (uint256 reserveIn, uint256 reserveOut)=
            isToken0 ? (reserve0, reserve1) : (reserve1, reserve0);
        
        amountOut= (reserveOut * _amountIn) / (reserveIn + _amountIn);
        require(amountOut > 0, "AMM: Invalid amount out");
        return amountOut;
    }
}
