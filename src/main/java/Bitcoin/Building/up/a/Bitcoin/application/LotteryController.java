package Bitcoin.Building.up.a.Bitcoin.application;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Random;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/lottery")
@Tag(name = "Lottery", description = "Endpoints to run and manage the photo lottery")
public class LotteryController {

    private final PhotoRepository photoRepository;
    private final LotteryPrizeRepository lotteryPrizeRepository;
    private final LotteryDrawRepository lotteryDrawRepository;
    // private final NotificationService notificationService; // keep commented if not compiling

    private final Random random = new Random();

    @PostMapping("/spin")
    @Operation(
            summary = "Run lottery spin",
            description = "Pick a random active prize and a winner from photos that are currently IN_DRAW"
    )
    public ResponseEntity<?> spinLottery() {
        try {
            // 1) Eligible photos: must be in the current draw
            List<Photo> eligiblePhotos = photoRepository.findByStatus(PhotoStatus.IN_DRAW);
            if (eligiblePhotos == null || eligiblePhotos.isEmpty()) {
                return ResponseEntity.ok(Map.of(
                        "success", false,
                        "message", "No eligible photos for lottery"
                ));
            }

            // 2) Active prizes
            List<LotteryPrize> activePrizes =
                    lotteryPrizeRepository.findByIsActiveTrueOrderByDisplayOrderAsc();
            if (activePrizes == null || activePrizes.isEmpty()) {
                return ResponseEntity.ok(Map.of(
                        "success", false,
                        "message", "No prizes configured for lottery"
                ));
            }

            // 3) Pick a prize (simple random)
            LotteryPrize selectedPrize = activePrizes.get(random.nextInt(activePrizes.size()));

            // 4) Pick a winning photo
            Collections.shuffle(eligiblePhotos, random);
            Photo winnerPhoto = eligiblePhotos.get(0);

            // 5) Persist the draw (your LotteryDraw stores winner as a User)
            LotteryDraw draw = new LotteryDraw();
            draw.setPrize(selectedPrize);
            draw.setWinner(winnerPhoto.getUser());
            lotteryDrawRepository.save(draw);

            // 6) Mark the winning photo
            winnerPhoto.setIsWinner(true);                // winner flag = true
            winnerPhoto.setStatus(PhotoStatus.DRAW_ENDED); // move out of current draw (optional but recommended)
            photoRepository.save(winnerPhoto);

            // 7) Optionally notify the winner (uncomment if your service compiles)
            /*
            try {
                notificationService.notifyWinner(winnerPhoto.getUser(), selectedPrize, winnerPhoto);
            } catch (Exception ignore) {
                log.warn("Failed to notify winner (non-fatal): {}", ignore.getMessage());
            }
            */

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Lottery spin completed",
                    "winnerPhotoId", winnerPhoto.getId(),
                    "winnerUserId", winnerPhoto.getUser() != null ? winnerPhoto.getUser().getId() : null,
                    "prizeId", selectedPrize.getId()
            ));
        } catch (Exception ex) {
            log.error("Error running lottery spin", ex);
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "message", "Error running lottery: " + ex.getMessage()
            ));
        }
    }

    @GetMapping("/eligible")
    @Operation(summary = "List eligible photos (IN_DRAW)")
    public ResponseEntity<?> listEligible() {
        List<Photo> eligible = photoRepository.findByStatus(PhotoStatus.IN_DRAW);
        return ResponseEntity.ok(Map.of(
                "count", eligible.size(),
                "items", eligible
        ));
    }

    @GetMapping("/prizes/active")
    @Operation(summary = "List active prizes")
    public ResponseEntity<?> listActivePrizes() {
        List<LotteryPrize> active =
                lotteryPrizeRepository.findByIsActiveTrueOrderByDisplayOrderAsc();
        return ResponseEntity.ok(Map.of(
                "count", active.size(),
                "items", active
        ));
    }
}
