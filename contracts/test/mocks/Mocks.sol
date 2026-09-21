// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {AggregatorV3Interface} from "../../src/interfaces/AggregatorV3Interface.sol";
import {IExactInputRouter} from "../../src/interfaces/IExactInputRouter.sol";
import {IPriceOracle} from "../../src/libraries/NavLib.sol";
import {ISwapAdapter} from "../../src/interfaces/ISwapAdapter.sol";
import {ISwapRouter02} from "../../src/interfaces/ISwapRouter02.sol";

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

    /// @dev ERC-8056-shaped UI balance; multiplier = 1.
    function balanceOfUI(address account) external view returns (uint256) {
        return balanceOf(account);
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

/// @dev Swap adapter that reverts on execute unless explicitly enabled.
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

/// @dev Test-only router. USDG (6) <-> 18-dec token at a set USDG-per-whole-token price.
contract MockRouter is IExactInputRouter {
    MockERC20 public immutable usdg;
    mapping(address => uint256) public usdgPerWhole;

    constructor(MockERC20 usdg_) {
        usdg = usdg_;
    }

    function setUsdgPerWhole(address token, uint256 priceUsdg) external {
        usdgPerWhole[token] = priceUsdg;
    }

    function swapExactIn(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        address recipient
    ) external returns (uint256 amountOut) {
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        address stock = tokenIn == address(usdg) ? tokenOut : tokenIn;
        uint256 px = usdgPerWhole[stock];
        require(px > 0, "no px");
        if (tokenIn == address(usdg)) {
            amountOut = (amountIn * 1e18) / px;
        } else {
            amountOut = (amountIn * px) / 1e18;
        }
        require(amountOut >= minAmountOut, "minOut");
        MockERC20(tokenOut).mint(recipient, amountOut);
    }
}

/// @dev Uniswap SwapRouter02-shaped mock for ExactInputRouter02 tests.
contract MockSwapRouter02 {
    MockERC20 public immutable usdg;
    mapping(address => uint256) public usdgPerWhole;

    constructor(MockERC20 usdg_) {
        usdg = usdg_;
    }

    function setUsdgPerWhole(address token, uint256 priceUsdg) external {
        usdgPerWhole[token] = priceUsdg;
    }

    function exactInputSingle(ISwapRouter02.ExactInputSingleParams calldata params)
        external
        payable
        returns (uint256 amountOut)
    {
        IERC20(params.tokenIn).transferFrom(msg.sender, address(this), params.amountIn);
        address stock = params.tokenIn == address(usdg) ? params.tokenOut : params.tokenIn;
        uint256 px = usdgPerWhole[stock];
        require(px > 0, "no px");
        if (params.tokenIn == address(usdg)) {
            amountOut = (params.amountIn * 1e18) / px;
        } else {
            amountOut = (params.amountIn * px) / 1e18;
        }
        require(amountOut >= params.amountOutMinimum, "minOut");
        MockERC20(params.tokenOut).mint(params.recipient, amountOut);
    }
}

/// @dev Settable AggregatorV3 for ChainlinkOracle tests.
contract MockAggregator is AggregatorV3Interface {
    int256 public answer;
    uint256 public updatedAt;
    uint8 public override decimals = 8;

    function set(int256 answer_, uint256 updatedAt_, uint8 decimals_) external {
        answer = answer_;
        updatedAt = updatedAt_;
        decimals = decimals_;
    }

    function latestRoundData()
        external
        view
        returns (uint80, int256, uint256, uint256, uint80)
    {
        return (1, answer, updatedAt, updatedAt, 1);
    }
}
