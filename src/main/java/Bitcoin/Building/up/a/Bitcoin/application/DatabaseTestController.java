package Bitcoin.Building.up.a.Bitcoin.application;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/test")
@Tag(name = "DB Test", description = "Quick endpoints to verify DB status counts")
public class DatabaseTestController {

    private final PhotoRepository photoRepository;

    @GetMapping("/photo-statuses")
    @Operation(summary = "Return counts for each photo status using the NEW enum + winner flag")
    public ResponseEntity<?> testPhotoStatuses() {
        try {
            Map<String, Object> response = new HashMap<>();

            if (photoRepository != null) {
                long inDraw    = photoRepository.countByStatus(PhotoStatus.IN_DRAW);
                long active    = photoRepository.countByStatus(PhotoStatus.ACTIVE);
                long deleted   = photoRepository.countByStatus(PhotoStatus.DELETED);
                long drawEnded = photoRepository.countByStatus(PhotoStatus.DRAW_ENDED);
                long winners   = photoRepository.countByIsWinnerTrue();

                response.put("in_draw",    inDraw);      // replaces old SUBMITTED
                response.put("active",     active);      // replaces old APPROVED (closest meaning)
                response.put("deleted",    deleted);     // replaces old REJECTED
                response.put("draw_ended", drawEnded);
                response.put("winners",    winners);     // winner is now a boolean flag
                response.put("total",      photoRepository.count());
                response.put("success",    true);
            } else {
                response.put("success", false);
                response.put("error", "PhotoRepository is null");
            }

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Photo status test failed: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "message", "Error while testing statuses: " + e.getMessage()
            ));
        }
    }
}
