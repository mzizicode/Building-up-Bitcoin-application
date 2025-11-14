package Bitcoin.Building.up.a.Bitcoin.application;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "escrow_deals")
public class EscrowDeal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // On-chain deal id from JoyTradeEscrow
    @Column(name = "deal_id", nullable = false)
    private Long dealId;

    // Optional link to marketplace order
    @Column(name = "order_id")
    private Long orderId;

    @Column(name = "buyer_address", nullable = false)
    private String buyerAddress;

    @Column(name = "seller_address", nullable = false)
    private String sellerAddress;

    @Column(name = "token_address", nullable = false)
    private String tokenAddress;

    // Amount in wei (USDT smallest units)
    @Column(name = "amount_wei", nullable = false, precision = 78, scale = 0)
    private BigDecimal amountWei;

    // Fee in basis points (e.g. 150 = 1.5%)
    @Column(name = "fee_bps", nullable = false)
    private Integer feeBps;

    // OPEN, FUNDED, RELEASED, REFUNDED, CANCELED
    @Column(name = "status", nullable = false)
    private String status;

    @Column(name = "created_tx_hash")
    private String createdTxHash;

    @Column(name = "funded_tx_hash")
    private String fundedTxHash;

    @Column(name = "released_tx_hash")
    private String releasedTxHash;

    @Column(name = "refunded_tx_hash")
    private String refundedTxHash;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    public EscrowDeal() {
    }

    // --- getters & setters ---

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getDealId() {
        return dealId;
    }

    public void setDealId(Long dealId) {
        this.dealId = dealId;
    }

    public Long getOrderId() {
        return orderId;
    }

    public void setOrderId(Long orderId) {
        this.orderId = orderId;
    }

    public String getBuyerAddress() {
        return buyerAddress;
    }

    public void setBuyerAddress(String buyerAddress) {
        this.buyerAddress = buyerAddress;
    }

    public String getSellerAddress() {
        return sellerAddress;
    }

    public void setSellerAddress(String sellerAddress) {
        this.sellerAddress = sellerAddress;
    }

    public String getTokenAddress() {
        return tokenAddress;
    }

    public void setTokenAddress(String tokenAddress) {
        this.tokenAddress = tokenAddress;
    }

    public BigDecimal getAmountWei() {
        return amountWei;
    }

    public void setAmountWei(BigDecimal amountWei) {
        this.amountWei = amountWei;
    }

    public Integer getFeeBps() {
        return feeBps;
    }

    public void setFeeBps(Integer feeBps) {
        this.feeBps = feeBps;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getCreatedTxHash() {
        return createdTxHash;
    }

    public void setCreatedTxHash(String createdTxHash) {
        this.createdTxHash = createdTxHash;
    }

    public String getFundedTxHash() {
        return fundedTxHash;
    }

    public void setFundedTxHash(String fundedTxHash) {
        this.fundedTxHash = fundedTxHash;
    }

    public String getReleasedTxHash() {
        return releasedTxHash;
    }

    public void setReleasedTxHash(String releasedTxHash) {
        this.releasedTxHash = releasedTxHash;
    }

    public String getRefundedTxHash() {
        return refundedTxHash;
    }

    public void setRefundedTxHash(String refundedTxHash) {
        this.refundedTxHash = refundedTxHash;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}

