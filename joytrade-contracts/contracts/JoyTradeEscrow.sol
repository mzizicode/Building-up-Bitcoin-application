// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract JoyTradeEscrow is ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;

    enum DealStatus { None, Open, Funded, Released, Refunded, Canceled }

    struct Deal {
        address buyer;
        address seller;
        IERC20  token;
        uint256 amount;
        uint64  expiresAt;   // 0 = no expiry
        uint16  feeBps;      // 100 = 1%
        DealStatus status;
        bytes32  metadata;   // optional orderId hash
    }

    event DealCreated(uint256 indexed dealId, address indexed buyer, address indexed seller, address token, uint256 amount, uint64 expiresAt, uint16 feeBps, bytes32 metadata);
    event DealFunded(uint256 indexed dealId, address indexed buyer, uint256 amount);
    event DealReleased(uint256 indexed dealId, address indexed seller, uint256 sellerPayout, uint256 feeAmount);
    event DealRefunded(uint256 indexed dealId, address indexed buyer, uint256 amount);
    event DealCanceled(uint256 indexed dealId);
    event FeeCollectorChanged(address indexed oldCollector, address indexed newCollector);

    address public feeCollector;
    uint256 public nextDealId = 1;
    mapping(uint256 => Deal) public deals;

    constructor(address _owner, address _feeCollector) Ownable(_owner) {
        require(_feeCollector != address(0), "feeCollector=0");
        feeCollector = _feeCollector;
        _transferOwnership(_owner); // set platform owner
    }

    function setFeeCollector(address _collector) external onlyOwner {
        require(_collector != address(0), "collector=0");
        emit FeeCollectorChanged(feeCollector, _collector);
        feeCollector = _collector;
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    function createDeal(
        address buyer,
        address seller,
        address token,
        uint256 amount,
        uint64  expiresAt,
        uint16  feeBps,
        bytes32 metadata
    ) external whenNotPaused returns (uint256 dealId) {
        require(buyer != address(0) && seller != address(0), "buyer/seller=0");
        require(token != address(0), "token=0");
        require(amount > 0, "amount=0");
        require(feeBps <= 2000, "fee too high");

        dealId = nextDealId++;
        deals[dealId] = Deal({
            buyer: buyer,
            seller: seller,
            token: IERC20(token),
            amount: amount,
            expiresAt: expiresAt,
            feeBps: feeBps,
            status: DealStatus.Open,
            metadata: metadata
        });

        emit DealCreated(dealId, buyer, seller, token, amount, expiresAt, feeBps, metadata);
    }

    function fund(uint256 dealId) external nonReentrant whenNotPaused {
        Deal storage d = deals[dealId];
        require(d.status == DealStatus.Open, "not open");
        require(msg.sender == d.buyer, "only buyer");
        if (d.expiresAt != 0) require(block.timestamp <= d.expiresAt, "expired");

        d.token.safeTransferFrom(msg.sender, address(this), d.amount);
        d.status = DealStatus.Funded;
        emit DealFunded(dealId, msg.sender, d.amount);
    }

    function release(uint256 dealId) external nonReentrant whenNotPaused {
        Deal storage d = deals[dealId];
        require(d.status == DealStatus.Funded, "not funded");
        require(msg.sender == d.buyer || msg.sender == owner(), "not authorized");

        uint256 fee = (d.amount * d.feeBps) / 10000;
        uint256 payout = d.amount - fee;

        d.status = DealStatus.Released;

        if (fee > 0) d.token.safeTransfer(feeCollector, fee);
        d.token.safeTransfer(d.seller, payout);

        emit DealReleased(dealId, d.seller, payout, fee);
    }

    function refund(uint256 dealId) external nonReentrant whenNotPaused {
        Deal storage d = deals[dealId];
        require(d.status == DealStatus.Funded, "not funded");
        require(msg.sender == d.buyer || msg.sender == owner(), "not authorized");

        d.status = DealStatus.Refunded;
        d.token.safeTransfer(d.buyer, d.amount);
        emit DealRefunded(dealId, d.buyer, d.amount);
    }

    function cancel(uint256 dealId) external whenNotPaused {
        Deal storage d = deals[dealId];
        require(d.status == DealStatus.Open, "not open");
        require(msg.sender == d.buyer || msg.sender == d.seller || msg.sender == owner(), "not authorized");
        d.status = DealStatus.Canceled;
        emit DealCanceled(dealId);
    }

    function getDeal(uint256 dealId) external view returns (Deal memory) {
        return deals[dealId];
    }
}
