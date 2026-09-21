// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

/// @title LpLocker
/// @notice Holds a Uniswap v3 position NFT for at least 365 days.
///         Owner withdraws to `beneficiary` only after unlock.
///         Cite NonfungiblePositionManager from
///         https://github.com/Uniswap/contracts/blob/main/deployments/4663.md
///         (`0x73991a25C818Bf1f1128dEAaB1492D45638DE0D3`). Seeding the
///         SEAT/USDG pool is a later owner tx — this contract only locks.
contract LpLocker is Ownable, IERC721Receiver {
    uint256 public constant MIN_LOCK = 365 days;

    IERC721 public nft;
    uint256 public tokenId;
    uint256 public unlockTime;
    address public beneficiary;
    bool public locked;

    event Locked(address indexed nft, uint256 indexed tokenId, uint256 unlockTime, address beneficiary);
    event Withdrawn(address indexed to, uint256 indexed tokenId);

    error TooShort();
    error AlreadyLocked();
    error NotLocked();
    error StillLocked();

    constructor(address initialOwner) Ownable(initialOwner) {}

    function lock(address nft_, uint256 tokenId_, uint256 duration, address beneficiary_)
        external
        onlyOwner
    {
        if (locked) revert AlreadyLocked();
        if (duration < MIN_LOCK) revert TooShort();
        require(nft_ != address(0), "nft=0");
        require(beneficiary_ != address(0), "beneficiary=0");
        nft = IERC721(nft_);
        tokenId = tokenId_;
        beneficiary = beneficiary_;
        unlockTime = block.timestamp + duration;
        locked = true;
        nft.safeTransferFrom(msg.sender, address(this), tokenId_);
        emit Locked(nft_, tokenId_, unlockTime, beneficiary_);
    }

    function withdraw() external onlyOwner {
        if (!locked) revert NotLocked();
        if (block.timestamp < unlockTime) revert StillLocked();
        locked = false;
        nft.safeTransferFrom(address(this), beneficiary, tokenId);
        emit Withdrawn(beneficiary, tokenId);
    }

    function onERC721Received(address, address, uint256, bytes calldata)
        external
        pure
        returns (bytes4)
    {
        return IERC721Receiver.onERC721Received.selector;
    }
}
