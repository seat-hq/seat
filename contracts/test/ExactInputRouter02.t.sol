// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {ExactInputRouter02} from "../src/ExactInputRouter02.sol";
import {SwapAdapter} from "../src/SwapAdapter.sol";
import {ISwapAdapter} from "../src/interfaces/ISwapAdapter.sol";
import {MockERC20, MockSwapRouter02} from "./mocks/Mocks.sol";

contract ExactInputRouter02Test is Test {
    MockERC20 internal usdg;
    MockERC20 internal tok;
    MockSwapRouter02 internal uni;
    ExactInputRouter02 internal wrapper;
    SwapAdapter internal swap;
    address internal vault = makeAddr("vault");

    function setUp() public {
        usdg = new MockERC20("USDG", "USDG", 6);
        tok = new MockERC20("NVDA", "NVDA", 18);
        uni = new MockSwapRouter02(usdg);
        uni.setUsdgPerWhole(address(tok), 100e6);
        wrapper = new ExactInputRouter02(address(uni), 3000);
        swap = new SwapAdapter(address(this));
        swap.setRouter(address(wrapper));
        swap.setAllowedToken(address(usdg), true);
        swap.setAllowedToken(address(tok), true);
        usdg.mint(vault, 1_000e6);
        vm.prank(vault);
        usdg.approve(address(swap), type(uint256).max);
    }

    function test_Wrapper_ExactInputSingle() public {
        ISwapAdapter.SwapParams memory p = ISwapAdapter.SwapParams({
            tokenIn: address(usdg),
            tokenOut: address(tok),
            amountIn: 100e6,
            minAmountOut: 1,
            recipient: vault
        });
        vm.prank(vault);
        uint256 out = swap.execute(p);
        assertEq(out, 1e18);
        assertEq(tok.balanceOf(vault), 1e18);
        assertEq(wrapper.poolFee(), 3000);
    }

    function test_Constructor_ZeroRouter_Reverts() public {
        vm.expectRevert("router=0");
        new ExactInputRouter02(address(0), 3000);
    }

    function test_Constructor_ZeroFee_Reverts() public {
        vm.expectRevert("fee=0");
        new ExactInputRouter02(address(uni), 0);
    }
}
