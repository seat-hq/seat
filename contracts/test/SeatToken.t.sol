// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {SeatToken} from "../src/SeatToken.sol";

contract SeatTokenTest is Test {
    function test_ConstructorReverts_NotDeployable() public {
        vm.expectRevert(SeatToken.NotDeployableInPhase0.selector);
        new SeatToken();
    }
}
