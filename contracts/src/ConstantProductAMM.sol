// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "contracts/lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "contracts/lib/openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";



contract ConstantProductAutomatedMarketMaker is ReentrancyGuard{
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
            shares= _min((_reserveAdded0/reserve0)* totalSupply, (_reserveAdded1/reserve1)*totalSupply);
        }

        require(shares > 0, "AMM: Invalid shares");

        _mintShares(msg.sender, shares);
        _updateReserves();
    }

    function removeLiquidity(uint256 _shares) external nonReentrant returns (uint256 reserveRemoved0, uint256 reserveRemoved1){
        require(_shares > 0, "AMM: Invalid shares");
        require(lpBalance[msg.sender] >= _shares, "AMM: Insufficient shares");

        reserveRemoved0= (_shares* reserve0)/totalSupply;
        reserveRemoved1= (_shares* reserve1)/totalSupply;

        require(reserveRemoved0 > 0 && reserveRemoved1 > 0, "AMM: Invlaid reserves");

        _burnShares(msg.sender, _shares);

        _updateReserves();
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
    }
}
