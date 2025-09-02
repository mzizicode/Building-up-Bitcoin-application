package Bitcoin.Building.up.a.Bitcoin.application;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

import static org.springframework.http.HttpStatus.*;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/photos")
@CrossOrigin(origins = "*")
@Tag(name = "Photo Management", description = "Photo upload and management endpoints")
public class PhotoUploadController {

    private final S3Service s3Service;
    private final PhotoRepository photoRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final WalletService walletService;

    private static final int SINGLE_PHOTO_LIMIT = 1;
    private static final int UPLOAD_REWARD_COINS = 25;

    // ---------------------------------------------------------------------
    // PUBLIC FEED (no auth) – used by the Globe page to show all entries
    // ---------------------------------------------------------------------
    @GetMapping("/lottery-feed")
    @Operation(summary = "Public: Get all photos visible in the lottery feed (IN_DRAW + current winners)")
    public ResponseEntity<?> getLotteryFeed() {
        try {
            // Get photos IN_DRAW with user data eagerly loaded
            List<Photo> inDrawPhotos = photoRepository.findByStatusWithUser(PhotoStatus.IN_DRAW);

            // Get all photos and filter for winners (since we need to check multiple conditions)
            List<Photo> allPhotos = photoRepository.findAll();
            List<Photo> winnerPhotos = allPhotos.stream()
                    .filter(p -> Boolean.TRUE.equals(p.getIsWinner()))
                    .collect(Collectors.toList());

            // Combine both lists
            List<Photo> visible = new ArrayList<>();
            visible.addAll(inDrawPhotos);
            visible.addAll(winnerPhotos);

            // Remove duplicates and sort
            visible = visible.stream()
                    .distinct()
                    .sorted(Comparator
                            .comparing((Photo p) -> Optional.ofNullable(p.getLotteryDate()).orElse(LocalDate.MIN))
                            .thenComparing((Photo p) -> Optional.ofNullable(p.getUploadDate()).orElse(LocalDateTime.MIN))
                            .reversed())
                    .collect(Collectors.toList());

            List<Map<String, Object>> items = visible.stream()
                    .map(this::photoToMap)
                    .collect(Collectors.toList());

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "photos", items,
                    "count", items.size()
            ));
        } catch (Exception e) {
            log.error("Failed to load lottery feed: {}", e.getMessage(), e);
            return ResponseEntity.status(INTERNAL_SERVER_ERROR).body(error("Failed to load lottery feed"));
        }
    }

    // ---------------------------------------------------------------------
    // PUBLIC current winner (no auth). Returns {"winner": null} if none
    // ---------------------------------------------------------------------
    @GetMapping("/current-winner")
    @Operation(summary = "Public: Get the current (most recent) winner")
    public ResponseEntity<?> getCurrentWinnerPublic() {
        try {
            Optional<Photo> winner = photoRepository.findAll().stream()
                    .filter(p -> Boolean.TRUE.equals(p.getIsWinner()))
                    .sorted(Comparator
                            .comparing((Photo p) -> Optional.ofNullable(p.getLotteryDate()).orElse(LocalDate.MIN))
                            .thenComparing((Photo p) -> Optional.ofNullable(p.getUploadDate()).orElse(LocalDateTime.MIN))
                            .reversed())
                    .findFirst();

            Map<String, Object> body = new LinkedHashMap<>();
            body.put("success", true);
            body.put("winner", winner.map(this::photoToMap).orElse(null));
            return ResponseEntity.ok(body);
        } catch (Exception e) {
            log.error("Failed to load current winner: {}", e.getMessage(), e);
            return ResponseEntity.status(INTERNAL_SERVER_ERROR).body(error("Failed to load current winner"));
        }
    }

    // ---------------------------------------------------------------------
    // Spin lottery (secured) – randomly pick one IN_DRAW and mark it winner
    // ---------------------------------------------------------------------
    @PostMapping("/spin-lottery")
    @Operation(summary = "Pick a winner from all IN_DRAW photos and mark it as winner")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<?> spinLottery() {
        try {
            getCurrentUser(); // ensure authenticated

            List<Photo> candidates = photoRepository.findAll().stream()
                    .filter(p -> p.getStatus() == PhotoStatus.IN_DRAW)
                    .collect(Collectors.toList());

            if (candidates.isEmpty()) {
                return ResponseEntity.ok(Map.of("success", true, "message", "No photos in draw", "winner", null));
            }

            Photo winner = candidates.get(new Random().nextInt(candidates.size()));
            winner.setIsWinner(true);
            winner.setLotteryDate(LocalDate.now());

            Photo savedWinner = photoRepository.save(winner);

            // Best-effort notification
            try {
                log.info("Winner selected: photoId={}, userId={}", savedWinner.getId(),
                        savedWinner.getUser() != null ? savedWinner.getUser().getId() : null);
            } catch (Exception notifyEx) {
                log.warn("Winner notification failed: {}", notifyEx.getMessage());
            }

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Winner selected successfully",
                    "winner", photoToMap(savedWinner)
            ));
        } catch (ResponseStatusException rse) {
            if (rse.getStatusCode().value() == 401) throw rse;
            return ResponseEntity.status(INTERNAL_SERVER_ERROR).body(error("Failed to spin lottery"));
        } catch (Exception e) {
            log.error("Spin lottery failed: {}", e.getMessage(), e);
            return ResponseEntity.status(INTERNAL_SERVER_ERROR).body(error("Failed to spin lottery"));
        }
    }

    // ---------------------------------------------------------------------
    // Check user submission status - FIXED VERSION
    // ---------------------------------------------------------------------
    @GetMapping("/check-user-submission/{userId}")
    @Operation(summary = "Check user submission status")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<?> checkUserSubmission(@PathVariable Long userId) {
        try {
            User currentUser = getCurrentUser();
            if (!Objects.equals(currentUser.getId(), userId)) {
                return ResponseEntity.status(FORBIDDEN).body(error("Access denied"));
            }

            // USE THE NEW METHOD WITH EAGER LOADING
            List<Photo> active = photoRepository.findByUser_IdAndStatusInWithUser(
                    userId, List.of(PhotoStatus.IN_DRAW));

            Map<String, Object> response = new LinkedHashMap<>();
            response.put("success", true);
            response.put("hasExistingSubmission", !active.isEmpty());
            response.put("activeSubmissionCount", active.size());
            response.put("singlePhotoLimit", SINGLE_PHOTO_LIMIT);
            response.put("hasReachedLimit", active.size() >= SINGLE_PHOTO_LIMIT);

            if (!active.isEmpty()) {
                Photo latest = active.stream()
                        .sorted(Comparator
                                .comparing((Photo p) -> Optional.ofNullable(p.getUploadDate()).orElse(LocalDateTime.MIN))
                                .reversed())
                        .findFirst().get();
                response.put("submission", photoToMap(latest));
            }

            return ResponseEntity.ok(response);
        } catch (ResponseStatusException rse) {
            if (rse.getStatusCode().value() == 401) throw rse;
            return ResponseEntity.status(INTERNAL_SERVER_ERROR).body(error("Failed to check submission status"));
        } catch (Exception e) {
            log.error("Failed to check user submission for ID {}: {}", userId, e.getMessage(), e);
            return ResponseEntity.status(INTERNAL_SERVER_ERROR).body(error("Failed to check submission status"));
        }
    }

    // ---------------------------------------------------------------------
    // Get user's photos - FIXED VERSION
    // ---------------------------------------------------------------------
    @GetMapping("/user/{userId}")
    @Operation(summary = "Get user's photos")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<?> getUserPhotos(@PathVariable Long userId) {
        try {
            User currentUser = getCurrentUser();
            if (!Objects.equals(currentUser.getId(), userId)) {
                return ResponseEntity.status(FORBIDDEN).body(error("Access denied"));
            }

            // USE THE NEW METHOD WITH EAGER LOADING
            List<Map<String, Object>> items = photoRepository.findByUser_IdWithUser(userId).stream()
                    .sorted(Comparator
                            .comparing((Photo p) -> Optional.ofNullable(p.getUploadDate()).orElse(LocalDateTime.MIN))
                            .reversed())
                    .map(this::photoToMap)
                    .collect(Collectors.toList());

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "photos", items,
                    "count", items.size(),
                    "userId", userId
            ));
        } catch (ResponseStatusException rse) {
            if (rse.getStatusCode().value() == 401) throw rse;
            return ResponseEntity.status(INTERNAL_SERVER_ERROR).body(error("Failed to load user photos"));
        } catch (Exception e) {
            log.error("Failed to load user photos for user {}: {}", userId, e.getMessage(), e);
            return ResponseEntity.status(INTERNAL_SERVER_ERROR).body(error("Failed to load user photos"));
        }
    }

    // ---------------------------------------------------------------------
    // IMPROVED: Submit photo with better error handling
    // ---------------------------------------------------------------------
    @PostMapping("/submit")
    @Operation(summary = "Submit photo to lottery (enters IN_DRAW and rewards +25 coins)")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<?> submitPhotoToLottery(
            @RequestParam("file") MultipartFile file,
            @RequestParam("description") String description
    ) {
        try {
            User currentUser = getCurrentUser();

            // Check single photo limit
            long activeCount = photoRepository.countByUser_IdAndStatusIn(
                    currentUser.getId(), List.of(PhotoStatus.IN_DRAW));
            if (activeCount >= SINGLE_PHOTO_LIMIT) {
                List<Photo> active = photoRepository.findByUser_IdAndStatusInWithUser(
                        currentUser.getId(), List.of(PhotoStatus.IN_DRAW));
                Map<String, Object> resp = new LinkedHashMap<>();
                resp.put("success", false);
                resp.put("message", "You can only submit ONE active photo at a time. Delete your existing submission first.");
                resp.put("errorCode", "SINGLE_PHOTO_LIMIT_EXCEEDED");
                resp.put("activeSubmissionCount", activeCount);
                if (!active.isEmpty()) resp.put("existingSubmission", photoToMap(active.get(0)));
                return ResponseEntity.badRequest().body(resp);
            }

            // Validate input
            validate(file, description);

            // Upload to S3
            String s3Url = s3Service.uploadFile(file);

            // Save photo to database
            Photo photo = Photo.builder()
                    .s3Url(s3Url)
                    .fileName(sanitizeFilename(file.getOriginalFilename()))
                    .description(sanitize(description))
                    .size(file.getSize())
                    .status(PhotoStatus.IN_DRAW)
                    .coinsEarned(UPLOAD_REWARD_COINS)
                    .user(currentUser)
                    .build();

            Photo saved = photoRepository.save(photo);

            // IMPROVED: Handle wallet operations with try-catch
            boolean coinsAwarded = false;
            String walletMessage = "";

            try {
                walletService.awardCoins(
                        currentUser.getId(),
                        BigDecimal.valueOf(UPLOAD_REWARD_COINS),
                        CoinTransaction.TransactionCategory.PHOTO_UPLOAD,
                        "Photo upload: " + photo.getDescription(),
                        "PHOTO-" + saved.getId()
                );
                coinsAwarded = true;
                walletMessage = String.format("You earned %d coins.", UPLOAD_REWARD_COINS);
                log.info("Successfully awarded {} coins to user {} for photo {}",
                        UPLOAD_REWARD_COINS, currentUser.getId(), saved.getId());
            } catch (Exception e) {
                // Log but don't fail the photo upload
                log.error("Failed to award coins for photo {}: {}", saved.getId(), e.getMessage());
                walletMessage = "Photo uploaded successfully (coin award pending).";
                // Could optionally update the photo's coinsEarned to 0 to reflect this
                saved.setCoinsEarned(0);
                photoRepository.save(saved);
            }

            // IMPROVED: Handle notification with try-catch
            try {
                notificationService.notifyPhotoUploaded(currentUser, saved);
            } catch (Exception e) {
                log.warn("Failed to send upload notification: {}", e.getMessage());
                // Continue - notification failure is not critical
            }

            // Build response with wallet status
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("success", true);
            body.put("message", "Photo submitted and entered into the draw! " + walletMessage);
            body.put("photo", photoToMap(saved));
            body.put("coinsEarned", coinsAwarded ? UPLOAD_REWARD_COINS : 0);
            body.put("coinsAwarded", coinsAwarded);
            body.put("singlePhotoPolicy", "Only one active (IN_DRAW) photo at a time. Delete it to upload another.");

            return ResponseEntity.ok(body);

        } catch (ValidationException e) {
            return ResponseEntity.badRequest().body(error(e.getMessage()));
        } catch (ResponseStatusException rse) {
            if (rse.getStatusCode().value() == 401) throw rse;
            return ResponseEntity.status(INTERNAL_SERVER_ERROR).body(error("Photo submission failed"));
        } catch (IOException e) {
            log.error("S3 upload failed: {}", e.getMessage(), e);
            return ResponseEntity.status(INTERNAL_SERVER_ERROR).body(error("Failed to upload file to storage"));
        } catch (Exception e) {
            log.error("Unexpected error in photo submission: {}", e.getMessage(), e);
            return ResponseEntity.status(INTERNAL_SERVER_ERROR).body(error("Photo submission failed"));
        }
    }

    // ---------------------------------------------------------------------
    // IMPROVED: Delete photo with better error handling
    // ---------------------------------------------------------------------
    @DeleteMapping("/{photoId}")
    @Operation(summary = "Delete photo (reverses coins if still IN_DRAW)")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<?> deletePhoto(@PathVariable Long photoId) {
        try {
            User currentUser = getCurrentUser();
            Optional<Photo> op = photoRepository.findById(photoId);
            if (op.isEmpty()) {
                return ResponseEntity.status(NOT_FOUND).body(Map.of(
                        "success", false,
                        "message", "Photo not found",
                        "errorCode", "PHOTO_NOT_FOUND"
                ));
            }

            Photo photo = op.get();
            if (!Objects.equals(photo.getUser().getId(), currentUser.getId())) {
                return ResponseEntity.status(FORBIDDEN).body(error("You can only delete your own photos"));
            }

            boolean inDraw = photo.getStatus() == PhotoStatus.IN_DRAW;
            boolean coinsReversed = false;
            String reversalMessage = "";

            // IMPROVED: Handle coin reversal with proper error handling
            if (inDraw && photo.getCoinsEarned() > 0) {
                try {
                    walletService.reverseTransactionByReference(
                            "PHOTO-" + photo.getId(),
                            "Photo deleted: " + (photo.getDescription() == null ? "" : photo.getDescription())
                    );
                    coinsReversed = true;
                    reversalMessage = String.format("%d coins deducted.", photo.getCoinsEarned());
                    log.info("Successfully reversed {} coins for deleted photo {}",
                            photo.getCoinsEarned(), photo.getId());
                } catch (RuntimeException ex) {
                    log.error("Failed to reverse coins for photo {}: {}", photo.getId(), ex.getMessage());

                    if (ex.getMessage() != null && ex.getMessage().contains("Insufficient balance")) {
                        Map<String, Object> resp = new LinkedHashMap<>();
                        resp.put("success", false);
                        resp.put("message", "Cannot delete photo: insufficient coins to reverse the reward.");
                        resp.put("errorCode", "INSUFFICIENT_BALANCE");
                        resp.put("coinsRequired", photo.getCoinsEarned());
                        return ResponseEntity.status(BAD_REQUEST).body(resp);
                    }
                    // For other errors, log but continue with deletion
                    reversalMessage = "Photo deleted (coin reversal pending).";
                }
            }

            // IMPROVED: Handle S3 deletion with try-catch
            try {
                if (photo.getS3Url() != null && !photo.getS3Url().isEmpty()) {
                    s3Service.deleteFile(photo.getS3Url());
                    log.info("Successfully deleted S3 object for photo {}", photo.getId());
                }
            } catch (Exception e) {
                log.warn("Failed to delete S3 object for photo {}: {}", photo.getId(), e.getMessage());
                // Continue - S3 deletion failure is not critical
            }

            // Delete from database
            photoRepository.delete(photo);

            // Build response with detailed status
            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("success", true);
            resp.put("photoId", photoId);
            resp.put("wasInDraw", inDraw);
            resp.put("coinsDeducted", coinsReversed ? photo.getCoinsEarned() : 0);
            resp.put("coinsReversed", coinsReversed);
            resp.put("message", inDraw
                    ? "Photo deleted. " + reversalMessage + " You can upload a new photo now."
                    : "Photo deleted successfully.");

            return ResponseEntity.ok(resp);

        } catch (ResponseStatusException rse) {
            if (rse.getStatusCode().value() == 401) throw rse;
            return ResponseEntity.status(INTERNAL_SERVER_ERROR).body(error("Failed to delete photo"));
        } catch (Exception e) {
            log.error("Delete failed: {}", e.getMessage(), e);
            return ResponseEntity.status(INTERNAL_SERVER_ERROR).body(error("Failed to delete photo"));
        }
    }

    // ---------------------------------------------------------------------
    // Get user submission statistics - FIXED VERSION
    // ---------------------------------------------------------------------
    @GetMapping("/user-stats")
    @Operation(summary = "Get user submission statistics")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<?> getUserSubmissionStats() {
        try {
            User currentUser = getCurrentUser();

            long total = photoRepository.countByUser_Id(currentUser.getId());
            long inDraw = photoRepository.countByUser_IdAndStatusIn(
                    currentUser.getId(), List.of(PhotoStatus.IN_DRAW));

            // USE THE NEW METHOD WITH EAGER LOADING
            Optional<Photo> mostRecent = photoRepository
                    .findFirstByUser_IdOrderByUploadDateDescWithUser(currentUser.getId());

            Map<String, Object> stats = new LinkedHashMap<>();
            stats.put("success", true);
            stats.put("userId", currentUser.getId());
            stats.put("totalSubmissions", total);
            stats.put("activeInDraw", inDraw);
            stats.put("canSubmitNew", inDraw < SINGLE_PHOTO_LIMIT);
            stats.put("singlePhotoLimit", SINGLE_PHOTO_LIMIT);
            mostRecent.ifPresent(p -> stats.put("mostRecentSubmission", photoToMap(p)));
            return ResponseEntity.ok(stats);
        } catch (ResponseStatusException rse) {
            if (rse.getStatusCode().value() == 401) throw rse;
            return ResponseEntity.status(INTERNAL_SERVER_ERROR).body(error("Failed to retrieve user statistics"));
        } catch (Exception e) {
            log.error("Stats failed: {}", e.getMessage(), e);
            return ResponseEntity.status(INTERNAL_SERVER_ERROR).body(error("Failed to retrieve user statistics"));
        }
    }

    // ---------------------------------------------------------------------
    // Update photo description
    // ---------------------------------------------------------------------
    @PatchMapping("/{photoId}/description")
    @Operation(summary = "Update your photo description")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<?> updateDescription(
            @PathVariable Long photoId,
            @RequestParam("description") String description
    ) {
        try {
            User currentUser = getCurrentUser();
            Photo photo = photoRepository.findById(photoId)
                    .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Photo not found"));

            if (!Objects.equals(photo.getUser().getId(), currentUser.getId())) {
                return ResponseEntity.status(FORBIDDEN).body(error("You can only edit your own photos"));
            }

            String clean = sanitize(description);
            if (clean.length() > 500) {
                return ResponseEntity.badRequest().body(error("Description must be under 500 characters"));
            }

            photo.setDescription(clean);
            Photo saved = photoRepository.save(photo);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "photo", photoToMap(saved)
            ));
        } catch (ResponseStatusException rse) {
            if (rse.getStatusCode().value() == 401) throw rse;
            return ResponseEntity.status(INTERNAL_SERVER_ERROR).body(error("Failed to update description"));
        } catch (Exception e) {
            log.error("Failed to update description: {}", e.getMessage(), e);
            return ResponseEntity.status(INTERNAL_SERVER_ERROR).body(error("Failed to update description"));
        }
    }

    // ====================== Helper Methods ======================

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth instanceof AnonymousAuthenticationToken) {
            throw new ResponseStatusException(UNAUTHORIZED, "Unauthorized: missing or invalid token");
        }
        String email = auth.getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(UNAUTHORIZED, "Unauthorized: user not found"));
    }

    private void validate(MultipartFile file, String description) throws ValidationException {
        if (file == null || file.isEmpty()) throw new ValidationException("File is required");
        if (description == null || description.trim().isEmpty())
            throw new ValidationException("Description is required");
        if (description.trim().length() > 500)
            throw new ValidationException("Description must be under 500 characters");
        String ct = file.getContentType();
        if (ct == null || !(ct.equals("image/jpeg") || ct.equals("image/jpg")
                || ct.equals("image/png") || ct.equals("image/gif") || ct.equals("image/webp")))
            throw new ValidationException("Only JPEG, PNG, GIF, WebP images are allowed");
        if (file.getSize() > 5 * 1024 * 1024)
            throw new ValidationException("File size must be < 5MB");
    }

    private String sanitize(String in) {
        if (in == null) return "";
        return in.replaceAll("[<>\"'&]", "").trim();
    }

    private String sanitizeFilename(String filename) {
        if (filename == null) return "image";
        return filename.replaceAll("[^a-zA-Z0-9.\\-_]", "_");
    }

    private Map<String, Object> photoToMap(Photo photo) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", photo.getId());
        m.put("s3Url", photo.getS3Url());
        m.put("image", photo.getS3Url());
        m.put("filename", photo.getFileName());
        m.put("description", photo.getDescription());
        m.put("status", String.valueOf(photo.getStatus()));
        m.put("size", photo.getSize());
        m.put("uploadDate", photo.getUploadDate());
        m.put("coinsEarned", photo.getCoinsEarned());
        m.put("isWinner", photo.getIsWinner());
        if (photo.getUser() != null) {
            m.put("submittedBy", photo.getUser().getName());
            m.put("user", photo.getUser().getName());
            m.put("userId", photo.getUser().getId());
        }
        if (photo.getLotteryDate() != null) m.put("lotteryDate", photo.getLotteryDate());
        return m;
    }

    private Map<String, Object> error(String msg) {
        Map<String, Object> e = new LinkedHashMap<>();
        e.put("success", false);
        e.put("message", msg);
        e.put("timestamp", new Date());
        return e;
    }

    private static class ValidationException extends Exception {
        public ValidationException(String message) { super(message); }
    }
}