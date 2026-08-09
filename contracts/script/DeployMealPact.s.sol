// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {MealPact} from "../src/MealPact.sol";

contract DeployMealPact is Script {
    function run() external returns (MealPact mealPact) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);
        mealPact = new MealPact();
        vm.stopBroadcast();
    }
}

