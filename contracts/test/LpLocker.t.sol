// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {LpLocker} from "../src/LpLocker.sol";

contract MockPositionNft is ERC721 {
    constructor() ERC721("V3", "V3") {}

    function mint(address to, uint256 id) external {
        _mint(to, id);
    }
}

contract LpLockerTest is Test {
    LpLocker internal locker;
    MockPositionNft internal nft;
    address internal beneficiary = makeAddr("lp");

    function setUp() public {
        locker = new LpLocker(address(this));
        nft = new MockPositionNft();
        nft.mint(address(this), 7);
        nft.approve(address(locker), 7);
    }

    function test_LockAndWithdrawAfterYear() public {
        locker.lock(address(nft), 7, 365 days, beneficiary);
        assertTrue(locker.locked());
        assertEq(nft.ownerOf(7), address(locker));

        vm.expectRevert(LpLocker.StillLocked.selector);
        locker.withdraw();

        vm.warp(block.timestamp + 365 days);
        locker.withdraw();
        assertEq(nft.ownerOf(7), beneficiary);
        assertFalse(locker.locked());
    }

    function test_ShortDuration_Reverts() public {
        vm.expectRevert(LpLocker.TooShort.selector);
        locker.lock(address(nft), 7, 364 days, beneficiary);
    }

    function test_DoubleLock_Reverts() public {
        locker.lock(address(nft), 7, 365 days, beneficiary);
        vm.expectRevert(LpLocker.AlreadyLocked.selector);
        locker.lock(address(nft), 7, 365 days, beneficiary);
    }
}
