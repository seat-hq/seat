// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {StdInvariant} from "forge-std/StdInvariant.sol";
import {DeskVault} from "../../src/DeskVault.sol";
import {RiskModule} from "../../src/RiskModule.sol";
import {SwapAdapter} from "../../src/SwapAdapter.sol";
import {MockERC20} from "../mocks/Mocks.sol";

/// @dev Drives deposits/redeems against a live vault. Never pauses, so no
///      withdrawals are queued and the vault's USDG balance equals its cash.
contract DeskHandler is Test {
    DeskVault public vault;
    MockERC20 public usdg;

    constructor(DeskVault vault_, MockERC20 usdg_) {
        vault = vault_;
        usdg = usdg_;
        usdg.approve(address(vault), type(uint256).max);
    }

    function deposit(uint256 amount) external {
        amount = bound(amount, 1, 1_000e6);
        usdg.mint(address(this), amount);
        vault.deposit(amount);
    }

    function redeem(uint256 amount) external {
        uint256 shares = vault.sharesOf(address(this));
        if (shares == 0) return;
        amount = bound(amount, 1, shares);
        vault.redeem(amount);
    }
}

contract DeskInvariants is StdInvariant, Test {
    MockERC20 internal usdg;
    RiskModule internal risk;
    SwapAdapter internal swap;
    DeskVault internal vault;
    DeskHandler internal handler;

    function setUp() public {
        usdg = new MockERC20("USD Gateway", "USDG", 6);
        risk = new RiskModule(address(this));
        swap = new SwapAdapter(address(this));
        vault = new DeskVault(address(this), address(usdg), risk, swap, makeAddr("leader"));
        handler = new DeskHandler(vault, usdg);

        targetContract(address(handler));
    }

    /// @notice Phase 0: NAV is exactly USDG cash (no positions are ever taken).
    function invariant_NavEqualsCash() public view {
        assertEq(vault.totalAssetsUsdg(), vault.cashUsdg());
    }

    /// @notice Accounting cash equals the vault's actual USDG balance (no queue).
    function invariant_CashMatchesBalance() public view {
        assertEq(usdg.balanceOf(address(vault)), vault.cashUsdg());
    }

    /// @notice With no shares outstanding, NAV per share is zero.
    function invariant_NoSharesNoNavPerShare() public view {
        if (vault.totalShares() == 0) {
            assertEq(vault.navPerShare(), 0);
        }
    }
}
