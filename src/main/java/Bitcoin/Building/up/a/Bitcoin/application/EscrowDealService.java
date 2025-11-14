package Bitcoin.Building.up.a.Bitcoin.application;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Service
@Transactional
public class EscrowDealService {

    private final EscrowDealRepository escrowDealRepository;

    public EscrowDealService(EscrowDealRepository escrowDealRepository) {
        this.escrowDealRepository = escrowDealRepository;
    }

    // ---------- CREATE ----------

    public EscrowDeal createDeal(
            Long dealId,
            Long orderId,
            String buyerAddress,
            String sellerAddress,
            String tokenAddress,
            BigDecimal amountWei,
            Integer feeBps,
            String createdTxHash
    ) {
        EscrowDeal deal = new EscrowDeal();
        deal.setDealId(dealId);
        deal.setOrderId(orderId);
        deal.setBuyerAddress(buyerAddress);
        deal.setSellerAddress(sellerAddress);
        deal.setTokenAddress(tokenAddress);
        deal.setAmountWei(amountWei);
        deal.setFeeBps(feeBps);
        deal.setStatus("OPEN");
        deal.setCreatedTxHash(createdTxHash);
        deal.setCreatedAt(LocalDateTime.now());
        deal.setUpdatedAt(LocalDateTime.now());

        return escrowDealRepository.save(deal);
    }

    // ---------- STATUS UPDATES ----------

    public EscrowDeal markFunded(Long dealId, String txHash) {
        EscrowDeal deal = getByDealIdOrThrow(dealId);
        deal.setStatus("FUNDED");
        deal.setFundedTxHash(txHash);
        deal.setUpdatedAt(LocalDateTime.now());
        return escrowDealRepository.save(deal);
    }

    public EscrowDeal markReleased(Long dealId, String txHash) {
        EscrowDeal deal = getByDealIdOrThrow(dealId);
        deal.setStatus("RELEASED");
        deal.setReleasedTxHash(txHash);
        deal.setUpdatedAt(LocalDateTime.now());
        return escrowDealRepository.save(deal);
    }

    public EscrowDeal markRefunded(Long dealId, String txHash) {
        EscrowDeal deal = getByDealIdOrThrow(dealId);
        deal.setStatus("REFUNDED");
        deal.setRefundedTxHash(txHash);
        deal.setUpdatedAt(LocalDateTime.now());
        return escrowDealRepository.save(deal);
    }

    public EscrowDeal markCanceled(Long dealId) {
        EscrowDeal deal = getByDealIdOrThrow(dealId);
        deal.setStatus("CANCELED");
        deal.setUpdatedAt(LocalDateTime.now());
        return escrowDealRepository.save(deal);
    }

    // ---------- HELPERS ----------

    public EscrowDeal getByDealIdOrThrow(Long dealId) {
        return escrowDealRepository.findByDealId(dealId)
                .orElseThrow(() -> new IllegalArgumentException("Escrow deal not found for dealId=" + dealId));
    }
}

