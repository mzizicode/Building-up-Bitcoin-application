package Bitcoin.Building.up.a.Bitcoin.application;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/escrow")
public class EscrowController {

    private final EscrowDealService escrowDealService;

    public EscrowController(EscrowDealService escrowDealService) {
        this.escrowDealService = escrowDealService;
    }

    // -------- CREATE DEAL (after calling createDeal on-chain) --------
    @PostMapping("/deals")
    public ResponseEntity<Map<String, Object>> createDeal(@RequestBody EscrowDealRequest request) {
        EscrowDeal deal = escrowDealService.createDeal(
                request.getDealId(),
                request.getOrderId(),
                request.getBuyerAddress(),
                request.getSellerAddress(),
                request.getTokenAddress(),
                request.getAmountWei(),
                request.getFeeBps(),
                request.getTxHash()
        );

        Map<String, Object> body = new HashMap<>();
        body.put("success", true);
        body.put("dealId", deal.getDealId());
        body.put("id", deal.getId());
        body.put("status", deal.getStatus());
        return ResponseEntity.ok(body);
    }

    // -------- MARK FUNDED --------
    @PostMapping("/deals/{dealId}/funded")
    public ResponseEntity<Map<String, Object>> markFunded(
            @PathVariable Long dealId,
            @RequestBody EscrowStatusUpdateRequest request
    ) {
        EscrowDeal deal = escrowDealService.markFunded(dealId, request.getTxHash());
        return okStatus(deal);
    }

    // -------- MARK RELEASED --------
    @PostMapping("/deals/{dealId}/released")
    public ResponseEntity<Map<String, Object>> markReleased(
            @PathVariable Long dealId,
            @RequestBody EscrowStatusUpdateRequest request
    ) {
        EscrowDeal deal = escrowDealService.markReleased(dealId, request.getTxHash());
        return okStatus(deal);
    }

    // -------- MARK REFUNDED --------
    @PostMapping("/deals/{dealId}/refunded")
    public ResponseEntity<Map<String, Object>> markRefunded(
            @PathVariable Long dealId,
            @RequestBody EscrowStatusUpdateRequest request
    ) {
        EscrowDeal deal = escrowDealService.markRefunded(dealId, request.getTxHash());
        return okStatus(deal);
    }

    // -------- MARK CANCELED --------
    @PostMapping("/deals/{dealId}/canceled")
    public ResponseEntity<Map<String, Object>> markCanceled(@PathVariable Long dealId) {
        EscrowDeal deal = escrowDealService.markCanceled(dealId);
        return okStatus(deal);
    }

    // -------- Helper to build JSON response --------
    private ResponseEntity<Map<String, Object>> okStatus(EscrowDeal deal) {
        Map<String, Object> body = new HashMap<>();
        body.put("success", true);
        body.put("dealId", deal.getDealId());
        body.put("status", deal.getStatus());
        return ResponseEntity.ok(body);
    }
}
