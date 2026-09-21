// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {ChainlinkOracle} from "../src/ChainlinkOracle.sol";
import {ExactInputRouter02} from "../src/ExactInputRouter02.sol";
import {RiskModule} from "../src/RiskModule.sol";
import {SwapAdapter} from "../src/SwapAdapter.sol";
import {FeeModule} from "../src/FeeModule.sol";
import {DeskFactory} from "../src/DeskFactory.sol";
import {DeskVault} from "../src/DeskVault.sol";
import {SeatToken} from "../src/SeatToken.sol";
import {StakingPool} from "../src/StakingPool.sol";
import {LpLocker} from "../src/LpLocker.sol";
import {IRiskModule} from "../src/interfaces/IRiskModule.sol";

/// @notice Phase 2 mainnet: $SEAT TGE, staking, 70/20/10 fees, extra desks.
///         Requires CONFIRM_MAINNET=I_UNDERSTAND and CONFIRM_SEAT_TGE=I_UNDERSTAND.
///         Does not invent leaders, NPM, or bucket addresses.
contract DeployPhase2 is Script {
    uint256 internal constant RH_MAINNET = 4663;
    uint256 internal constant DEPOSIT_CAP = 50_000e6;
    uint256 internal constant DEFAULT_BOND = 100_000 ether;

    address internal constant USDG = 0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168;
    address internal constant SWAP_ROUTER02 = 0xCaf681a66D020601342297493863E78C959E5cb2;
    uint24 internal constant POOL_FEE = 3000;

    address internal constant NVDA = 0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC;
    address internal constant AAPL = 0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9;
    address internal constant SPY = 0x117cc2133c37B721F49dE2A7a74833232B3B4C0C;

    address internal constant FEED_NVDA = 0x379EC4f7C378F34a1B47E4F3cbeBCbAC3E8E9F15;
    address internal constant FEED_AAPL = 0x6B22A786bAa607d76728168703a39Ea9C99f2cD0;
    address internal constant FEED_SPY = 0x319724394D3A0e3669269846abE664Cd621f9f6A;
    /// @dev Uniswap v3 NonfungiblePositionManager — deployments/4663.md.
    address internal constant POSITION_MANAGER = 0x73991a25C818Bf1f1128dEAaB1492D45638DE0D3;

    function run() external {
        require(
            keccak256(bytes(vm.envOr("CONFIRM_MAINNET", string("")))) == keccak256(bytes("I_UNDERSTAND")),
            "refusing: set CONFIRM_MAINNET=I_UNDERSTAND"
        );
        require(
            keccak256(bytes(vm.envOr("CONFIRM_SEAT_TGE", string("")))) == keccak256(bytes("I_UNDERSTAND")),
            "refusing: set CONFIRM_SEAT_TGE=I_UNDERSTAND"
        );
        require(block.chainid == RH_MAINNET, "not Robinhood mainnet");

        address owner = vm.envOr("OWNER", msg.sender);
        require(owner == msg.sender, "OWNER must be the broadcaster");
        address usdg = vm.envOr("USDG_ADDRESS", USDG);
        require(usdg == USDG, "USDG_ADDRESS must be official 4663 USDG");
        address holder = vm.envOr("SEAT_HOLDER", owner);
        address protocol = vm.envOr("PROTOCOL_FEE_RECIPIENT", owner);
        address keeper = vm.envOr("KEEPER_ADDRESS", address(0));
        uint256 bond = vm.envOr("LISTING_BOND_SEAT", DEFAULT_BOND);
        uint256 depositCap = vm.envOr("DEPOSIT_CAP_USDG", DEPOSIT_CAP);
        uint24 poolFee = uint24(vm.envOr("SWAP_POOL_FEE", uint256(POOL_FEE)));

        address leader1 = vm.envOr("LEADER_ADDRESS", address(0));
        address leader2 = vm.envOr("LEADER_2", address(0));
        address leader3 = vm.envOr("LEADER_3", address(0));

        vm.startBroadcast();

        SeatToken seat = new SeatToken(holder);
        StakingPool pool = new StakingPool(address(seat), usdg);
        LpLocker locker = new LpLocker(owner);

        RiskModule risk = new RiskModule(owner);
        SwapAdapter swap = new SwapAdapter(owner);
        ExactInputRouter02 wrapper = new ExactInputRouter02(SWAP_ROUTER02, poolFee);
        swap.setRouter(address(wrapper));
        swap.setAllowedToken(usdg, true);
        swap.setAllowedToken(NVDA, true);
        swap.setAllowedToken(AAPL, true);
        swap.setAllowedToken(SPY, true);

        FeeModule fee = new FeeModule(
            owner,
            FeeModule.FeeParams({
                performanceFeeBps: 1_000,
                aumFeeBpsPerYear: 200,
                protocolShareBps: 2_000,
                stakerShareBps: 1_000
            })
        );
        ChainlinkOracle oracle = new ChainlinkOracle(owner);
        oracle.setFeed(NVDA, FEED_NVDA);
        oracle.setFeed(AAPL, FEED_AAPL);
        oracle.setFeed(SPY, FEED_SPY);

        DeskFactory factory = new DeskFactory(owner, usdg, risk, swap);
        factory.setListingParams(address(seat), bond);

        address vault1 = _maybeCreate(factory, oracle, fee, risk, keeper, protocol, address(pool), depositCap, leader1);
        address vault2 = _maybeCreate(factory, oracle, fee, risk, keeper, protocol, address(pool), depositCap, leader2);
        address vault3 = _maybeCreate(factory, oracle, fee, risk, keeper, protocol, address(pool), depositCap, leader3);

        vm.stopBroadcast();

        uint256 npm = uint256(uint160(vm.envOr("POSITION_MANAGER_ADDRESS", POSITION_MANAGER)));
        uint256 lpUsdg = vm.envOr("SEAT_LP_USDG", uint256(0));
        console2.log("Cited NPM", POSITION_MANAGER);
        if (npm == 0 || lpUsdg == 0) {
            console2.log("LP seed skipped (SEAT_LP_USDG unset; locker shipped, seed+lock later)");
        } else {
            console2.log("LP seed requested; mint+lock is a manual owner tx after pool exists");
            console2.log("POSITION_MANAGER_ADDRESS", address(uint160(npm)));
            console2.log("SEAT_LP_USDG", lpUsdg);
        }

        console2.log("SeatToken", address(seat));
        console2.log("StakingPool", address(pool));
        console2.log("LpLocker", address(locker));
        console2.log("FeeModule", address(fee));
        console2.log("RiskModule", address(risk));
        console2.log("SwapAdapter", address(swap));
        console2.log("ExactInputRouter02", address(wrapper));
        console2.log("ChainlinkOracle", address(oracle));
        console2.log("DeskFactory", address(factory));
        console2.log("DeskVault1", vault1);
        console2.log("DeskVault2", vault2);
        console2.log("DeskVault3", vault3);
        console2.log("listingBondSeat", bond);
        console2.log("SEAT holder", holder);
    }

    function _maybeCreate(
        DeskFactory factory,
        ChainlinkOracle oracle,
        FeeModule fee,
        RiskModule risk,
        address keeper,
        address protocol,
        address staker,
        uint256 depositCap,
        address leader
    ) internal returns (address vault) {
        if (leader == address(0)) return address(0);
        vault = factory.createDesk(leader);
        DeskVault desk = DeskVault(vault);
        desk.setOracle(oracle);
        desk.setFeeModule(fee);
        desk.setFeeRecipients(protocol, leader, staker);
        desk.setDepositCap(depositCap);
        if (keeper != address(0)) desk.setKeeper(keeper);
        uint256 maxFillUsdg = vm.envOr("MAX_FILL_USDG", uint256(5_000e6));
        uint256 maxPositionUsdg = vm.envOr("MAX_POSITION_USDG", uint256(20_000e6));
        uint256 maxGrossUsdg = vm.envOr("MAX_GROSS_USDG", uint256(50_000e6));
        uint256 maxDrawdownBps = vm.envOr("MAX_DRAWDOWN_BPS", uint256(2_000));
        uint256 maxStalenessSec = vm.envOr("MAX_STALENESS_SEC", uint256(120));
        risk.configureDesk(
            vault, maxFillUsdg, maxPositionUsdg, maxGrossUsdg, uint16(maxDrawdownBps), uint32(maxStalenessSec)
        );
        risk.setTokenAllowed(vault, NVDA, true);
        risk.setTokenAllowed(vault, AAPL, true);
        risk.setTokenAllowed(vault, SPY, true);
        risk.setSessionRisk(vault, IRiskModule.Session.Regular, 10_000);
        risk.setSessionRisk(vault, IRiskModule.Session.PreMarket, 3_000);
        risk.setSessionRisk(vault, IRiskModule.Session.AfterHours, 3_000);
        risk.setSessionRisk(vault, IRiskModule.Session.Closed, 0);
    }
}
