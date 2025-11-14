package Bitcoin.Building.up.a.Bitcoin.application;

public class EscrowStatusUpdateRequest {

    private String txHash; // transaction hash of the action (fund/release/refund)

    public String getTxHash() {
        return txHash;
    }

    public void setTxHash(String txHash) {
        this.txHash = txHash;
    }
}
