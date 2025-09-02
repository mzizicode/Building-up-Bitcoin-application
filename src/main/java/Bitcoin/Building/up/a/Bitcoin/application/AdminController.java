package Bitcoin.Building.up.a.Bitcoin.application;
import Bitcoin.Building.up.a.Bitcoin.application.PhotoStatus;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin")
@CrossOrigin(origins = "*")
@Tag(name = "Admin", description = "Administrative endpoints")
public class AdminController {

    private final UserRepository userRepository;
    private final PhotoRepository photoRepository;
    private final MarketplaceItemRepository marketplaceItemRepository;
    private final MarketplaceOrderRepository orderRepository;
    private final WalletRepository walletRepository;
    private final LotteryDrawRepository lotteryDrawRepository;
    private final LotteryPrizeRepository lotteryPrizeRepository;
    private final CoinTransactionRepository coinTransactionRepository;

    // ---------------------------------------------------------------------
    // Dashboard stats
    // ---------------------------------------------------------------------
    @GetMapping("/stats")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get admin dashboard stats", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<Map<String, Object>> getStats() {
        Map<String, Object> stats = new HashMap<>();

        // Basic counts
        stats.put("users", userRepository.count());
        stats.put("photos", photoRepository.count());
        stats.put("marketplaceItems", marketplaceItemRepository.count());
        stats.put("orders", orderRepository.count());
        stats.put("wallets", walletRepository.count());
        stats.put("prizes", lotteryPrizeRepository.count());
        stats.put("draws", lotteryDrawRepository.count());
        stats.put("coinTransactions", coinTransactionRepository.count());

        // Photo status counts
// Photo status counts (mapped to your old dashboard labels)
        long submittedPhotos = photoRepository.countByStatus(PhotoStatus.IN_DRAW);  // previously SUBMITTED
        long approvedPhotos  = photoRepository.countByStatus(PhotoStatus.ACTIVE);   // previously APPROVED
        long rejectedPhotos  = photoRepository.countByStatus(PhotoStatus.DELETED);  // previously REJECTED
        long winnerPhotos    = photoRepository.countByIsWinnerTrue();               // previously WINNER via status

        stats.put("photosSubmitted", submittedPhotos);
        stats.put("photosApproved",  approvedPhotos);
        stats.put("photosRejected",  rejectedPhotos);
        stats.put("photosWinners",   winnerPhotos);




        // Marketplace item status counts
        long activeItems  = marketplaceItemRepository.countByStatus(MarketplaceItem.ItemStatus.ACTIVE);
        long soldItems    = marketplaceItemRepository.countByStatus(MarketplaceItem.ItemStatus.SOLD);
        long deletedItems = marketplaceItemRepository.countByStatus(MarketplaceItem.ItemStatus.DELETED);

        stats.put("itemsActive", activeItems);
        stats.put("itemsSold", soldItems);
        stats.put("itemsDeleted", deletedItems);

        return ResponseEntity.ok(stats);
    }

    // ---------------------------------------------------------------------
    // Prize management: delete a prize and its draws
    // ---------------------------------------------------------------------
    @DeleteMapping("/prizes/{prizeId}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Delete a prize and related draws", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<?> deletePrize(@PathVariable Long prizeId) {
        LotteryPrize prize = lotteryPrizeRepository.findById(prizeId)
                .orElseThrow(() -> new RuntimeException("Prize not found"));

        List<LotteryDraw> draws = lotteryDrawRepository.findByPrize(prize);

        if (!draws.isEmpty()) {
            lotteryDrawRepository.deleteAll(draws);
        }
        lotteryPrizeRepository.delete(prize);

        Map<String, Object> resp = new HashMap<>();
        resp.put("deletedPrizeId", prizeId);
        resp.put("deletedDraws", draws.size());
        return ResponseEntity.ok(resp);
    }

    // ---------------------------------------------------------------------
    // List draws for a prize
    // ---------------------------------------------------------------------
    @GetMapping("/prizes/{prizeId}/draws")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "List draws for a prize", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<List<LotteryDraw>> listDrawsForPrize(@PathVariable Long prizeId) {
        LotteryPrize prize = lotteryPrizeRepository.findById(prizeId)
                .orElseThrow(() -> new RuntimeException("Prize not found"));
        List<LotteryDraw> draws = lotteryDrawRepository.findByPrize(prize);
        return ResponseEntity.ok(draws);
    }

    // ---------------------------------------------------------------------
    // Upload placeholder for admin
    // ---------------------------------------------------------------------
    @PostMapping("/upload")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Admin upload placeholder", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<Map<String, Object>> upload(@RequestParam("file") MultipartFile file) {
        Map<String, Object> resp = new HashMap<>();
        resp.put("filename", file.getOriginalFilename());
        resp.put("size", file.getSize());
        resp.put("status", "received");
        return ResponseEntity.ok(resp);
    }
}
