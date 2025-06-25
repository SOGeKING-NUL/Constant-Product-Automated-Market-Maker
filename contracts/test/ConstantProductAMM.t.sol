// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/ConstantProductAMM.sol";
import "../script/HelperConfig.s.sol";
import "../src/LPToken.sol";

contract AMMTest is Test{
    ConstantProductAutomatedMarketMaker amm;
    LPToken lpToken;
    MockERC20 weth;
    MockERC20 usdc;

    address user= makeAddr("user");

    function setUp() public{
        HelperConfig helperConfig = new HelperConfig();
        HelperConfig.NetworkConfig memory config= helperConfig.getOrCreateAnvilConfig();
        
        weth= MockERC20(config.token0); //converts the address into the mock erc20 instance
        usdc= MockERC20(config.token1);

        amm= new ConstantProductAutomatedMarketMaker(config.token0, config.token1);
        lpToken= amm.lpToken();

        weth.mint(user, 10000 * 10**18);
        usdc.mint(user, 10000 * 10**6);

                
    }

    function add_Liquidity() public returns(uint256 shares, uint256 amount0, uint256 amount1){
        amount0 = 1000 * 10**18;  
        amount1 = 1000 * 10**6;    
        
        vm.startPrank(user);
        weth.approve(address(amm), amount0);
        usdc.approve(address(amm), amount1);
        
        shares = amm.addLiquidity(amount0, amount1);
        vm.stopPrank();

    }

    function testAddLiquiditySuccess() public {        
        (uint256 shares, ,) = add_Liquidity();
        assertGt(shares, 0);
    }

    function testAddLiquidityZeroAmounts() public {
        vm.expectRevert("AMM: Invalid reserve values");
        amm.addLiquidity(0, 1000);
        
        vm.expectRevert("AMM: Invalid reserve values");
        amm.addLiquidity(1000, 0);
    }


    function testRemoveLiquiditySuccess() public{

        //arrange
        (uint256 shares, uint256 amount0Added, uint256 amount1Added)= add_Liquidity();

        //act
        vm.startPrank(user);
        (uint256 amount0Removed, uint256 amount1Removed)= amm.removeLiquidity(shares);

        //assert 
        assertEq(amount0Added, amount0Removed);
        assertEq(amount1Added, amount1Removed);
        vm.stopPrank();
    }



}