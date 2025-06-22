// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.20;


import {Script} from "forge-std/Script.sol";
import "../src/ConstantProductAMM.sol";
import "./HelperConfig.s.sol";

contract DeployConstantProductAMM is Script{

    function run() external returns(ConstantProductAutomatedMarketMaker, HelperConfig){
        HelperConfig helperConfig = new HelperConfig();
        HelperConfig.NetworkConfig memory config= helperConfig.getConfig();

        vm.startBroadcast();

        ConstantProductAutomatedMarketMaker amm= new ConstantProductAutomatedMarketMaker( config.token0, config.token1);

        vm.stopBroadcast();

        return (amm, helperConfig);
    }
}




