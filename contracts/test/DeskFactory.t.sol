// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {DeskFactory} from "../src/DeskFactory.sol";
import {DeskVault} from "../src/DeskVault.sol";
import {RiskModule} from "../src/RiskModule.sol";
import {SwapAdapter} from "../src/SwapAdapter.sol";
import {MockERC20} from "./mocks/Mocks.sol";

contract DeskFactoryTest is Test {
    MockERC20 internal usdg;
    RiskModule internal risk;
    SwapAdapter internal swap;
    DeskFactory internal factory;

    address internal leader = makeAddr("leader");
    address internal otherLeader = makeAddr("otherLeader");
    address internal alice = makeAddr("alice");

    function setUp() public {
        usdg = new MockERC20("USD Gateway", "USDG", 6);
        risk = new RiskModule(address(this));
        swap = new SwapAdapter(address(this));
        factory = new DeskFactory(address(this), address(usdg), risk, swap);
    }

    function test_CreateDesk_WiresLeaderAndUsdg() public {
        address vaultAddr = factory.createDesk(leader);
        DeskVault vault = DeskVault(vaultAddr);

        assertEq(vault.leader(), leader);
        assertEq(address(vault.usdg()), address(usdg));
        assertEq(vault.owner(), address(this));
        assertEq(factory.deskOf(leader), vaultAddr);
        assertEq(factory.deskCount(), 1);
        assertEq(factory.allDesks(0), vaultAddr);
    }

    function test_CreateDesk_OwnerOnly() public {
        vm.prank(alice);
        vm.expectRevert();
        factory.createDesk(leader);
    }

    function test_CreateDesk_DuplicateLeaderReverts() public {
        factory.createDesk(leader);
        vm.expectRevert(abi.encodeWithSelector(DeskFactory.DeskExists.selector, leader));
        factory.createDesk(leader);
    }

    function test_CreateDesk_ZeroLeaderReverts() public {
        vm.expectRevert(bytes("leader=0"));
        factory.createDesk(address(0));
    }

    function test_CreateDesk_SecondLeaderGetsOwnVault() public {
        address first = factory.createDesk(leader);
        address second = factory.createDesk(otherLeader);
        assertTrue(first != second);
        assertEq(DeskVault(second).leader(), otherLeader);
        assertEq(factory.deskCount(), 2);
    }
}
