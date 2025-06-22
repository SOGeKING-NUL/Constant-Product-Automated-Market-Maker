// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.20;


import {Script} from "forge-std/Script.sol";
import "../src/ConstantProductAMM.sol";

abstract contract CodeConstants{    //we keep all the constants and magic numbers here
    uint256 constant public BASE_SEPOLIA_CHAIN_ID= 84532;
    uint256 constant public BASE_MAINNET_CHAIN_ID= 8453;
    uint256 constant public LOCAL_CHAIN_ID= 31337; //anvil
    address constant public USDC_BASE_SEPOLIA_ADDRESS= 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
    address constant public WETH_BASE_SEPOLIA_ADDRESS = 0x4200000000000000000000000000000000000006;
}

contract HelperConfig is CodeConstants, Script{

    //errors
    error HelperConfig_InvalidChainId();

    struct NetworkConfig{
        address token0;
        address token1;
    }

    mapping(uint256 chainId => NetworkConfig) public networkConfigs;

    constructor(){
        networkConfigs[BASE_SEPOLIA_CHAIN_ID] = getBaseSepoliaConfig();
    }

    function getBaseSepoliaConfig() public pure returns(NetworkConfig memory){
        return NetworkConfig({
            token0: WETH_BASE_SEPOLIA_ADDRESS,
            token1: USDC_BASE_SEPOLIA_ADDRESS 
        });
    }

    function getNetworkConfigByChainId(uint256 chainId) public view returns(NetworkConfig memory){
        if(networkConfigs[chainId].token0 != address(0) && networkConfigs[chainId].token1 != address(0)){
            return networkConfigs[chainId];
        }
        else{
            revert HelperConfig_InvalidChainId();
        }
    }

    function getConfig() public view returns(NetworkConfig memory) {
        return getNetworkConfigByChainId(block.chainid);
    }

}



