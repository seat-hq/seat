// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {SwapAdapter} from "../src/SwapAdapter.sol";
import {ISwapAdapter} from "../src/interfaces/ISwapAdapter.sol";
import {MockERC20, MockRouter} from "./mocks/Mocks.sol";

contract SwapAdapterTest is Test {
    MockERC20 internal usdg;
    MockERC20 internal tok;
    MockRouter internal router;
    SwapAdapter internal swap;
    address internal vault = makeAddr("vault");

    function setUp() public {
        usdg = new MockERC20("USDG", "USDG", 6);
        tok = new MockERC20("T", "T", 18);
        router = new MockRouter(usdg);
        router.setUsdgPerWhole(address(tok), 100e6);
        swap = new SwapAdapter(address(this));
        swap.setAllowedToken(address(usdg), true);
        swap.setAllowedToken(address(tok), true);
        usdg.mint(vault, 1_000e6);
        vm.prank(vault);
        usdg.approve(address(swap), type(uint256).max);
    }

    function test_Execute_NoRouter_Reverts() public {
        ISwapAdapter.SwapParams memory p = ISwapAdapter.SwapParams({
            tokenIn: address(usdg),
            tokenOut: address(tok),
            amountIn: 100e6,
            minAmountOut: 1,
            recipient: vault
        });
        vm.prank(vault);
        vm.expectRevert(SwapAdapter.RouterNotConfigured.selector);
        swap.execute(p);
    }

    function test_Execute_WithMockRouter() public {
        swap.setRouter(address(router));
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
    }

    function test_Execute_UnallowedToken_Reverts() public {
        swap.setRouter(address(router));
        address other = address(new MockERC20("Y", "Y", 18));
        ISwapAdapter.SwapParams memory p = ISwapAdapter.SwapParams({
            tokenIn: address(usdg),
            tokenOut: other,
            amountIn: 1,
            minAmountOut: 1,
            recipient: vault
        });
        vm.prank(vault);
        vm.expectRevert(abi.encodeWithSelector(SwapAdapter.TokenNotAllowed.selector, other));
        swap.execute(p);
    }
}
