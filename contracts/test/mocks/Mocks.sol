// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IPriceOracle} from "../../src/libraries/NavLib.sol";
import {ISwapAdapter} from "../../src/interfaces/ISwapAdapter.sol";

/// @dev Mintable ERC20 with configurable decimals for tests.
contract MockERC20 is ERC20 {
    uint8 private immutable _decimals;

    constructor(string memory n, string memory s, uint8 d) ERC20(n, s) {
        _decimals = d;
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/// @dev Settable price oracle for NAV tests.
contract MockOracle is IPriceOracle {
    struct Feed {
        uint256 value;
        uint8 decimals;
        uint256 updatedAt;
    }

    mapping(address => Feed) public feeds;

    function set(address token, uint256 value, uint8 decimals, uint256 updatedAt) external {
        feeds[token] = Feed({value: value, decimals: decimals, updatedAt: updatedAt});
    }

    function price(address token)
        external
        view
        returns (uint256 value, uint8 decimals, uint256 updatedAt)
    {
        Feed memory f = feeds[token];
        return (f.value, f.decimals, f.updatedAt);
    }
}

/// @dev Swap adapter that reverts on execute unless explicitly enabled. Used to
///      demonstrate that Phase 0 execution fails closed.
contract MockSwapAdapter is ISwapAdapter {
    bool public enabled;

    function setEnabled(bool v) external {
        enabled = v;
    }

    function validate(SwapParams calldata) external view returns (bool, string memory) {
        return enabled ? (true, "ok") : (false, "disabled");
    }

    function quote(SwapParams calldata params) external view returns (uint256) {
        require(enabled, "disabled");
        return params.amountIn;
    }

    function execute(SwapParams calldata params) external view returns (uint256) {
        require(enabled, "disabled");
        return params.amountIn;
    }
}
