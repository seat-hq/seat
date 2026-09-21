// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {ChainlinkOracle} from "../src/ChainlinkOracle.sol";
import {MockAggregator} from "./mocks/Mocks.sol";

contract ChainlinkOracleTest is Test {
    ChainlinkOracle internal oracle;
    MockAggregator internal feed;
    address internal token = makeAddr("token");

    function setUp() public {
        oracle = new ChainlinkOracle(address(this));
        feed = new MockAggregator();
        feed.set(120_00000000, block.timestamp, 8);
        oracle.setFeed(token, address(feed));
    }

    function test_Price_ReadsAggregator() public view {
        (uint256 value, uint8 dec, uint256 updated) = oracle.price(token);
        assertEq(value, 120_00000000);
        assertEq(dec, 8);
        assertEq(updated, block.timestamp);
    }

    function test_Price_NoFeed_Reverts() public {
        vm.expectRevert(abi.encodeWithSelector(ChainlinkOracle.NoFeed.selector, makeAddr("x")));
        oracle.price(makeAddr("x"));
    }

    function test_Price_BadAnswer_Reverts() public {
        feed.set(0, block.timestamp, 8);
        vm.expectRevert(abi.encodeWithSelector(ChainlinkOracle.BadPrice.selector, token));
        oracle.price(token);
    }

    function test_SetFeed_OwnerOnly() public {
        vm.prank(makeAddr("eve"));
        vm.expectRevert();
        oracle.setFeed(token, address(feed));
    }
}
