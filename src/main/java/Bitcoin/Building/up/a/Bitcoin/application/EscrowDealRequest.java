package Bitcoin.Building.up.a.Bitcoin.application;

import java.math.BigDecimal;

public class EscrowDealRequest {

    private Long dealId;           // on-chain deal id
    private Long orderId;          // optional marketplace order id
    private String buyerAddress;
    private String sellerAddress;
    private String tokenAddress;
    private BigDecimal amountWei;  // amount in wei
    private Integer feeBps;
    private String txHash;         // transaction hash of createDeal

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

    public String getTxHash() {
        return txHash;
    }

    public void setTxHash(String txHash) {
        this.txHash = txHash;
    }
}
