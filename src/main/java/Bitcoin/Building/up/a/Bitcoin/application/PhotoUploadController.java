package Bitcoin.Building.up.a.Bitcoin.application;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.*;
import java.util.stream.Collectors;

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

    /**
     * 🛠️ FIXED: Submit photo with proper error handling and validation
     */
    @PostMapping("/submit")
    @Operation(summary = "Submit photo to lottery", description = "Upload and submit a photo for the lottery competition")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<?> submitPhotoToLottery(
            @RequestParam("file") MultipartFile file,
            @RequestParam("description") String description) {

        try {
            // Get authenticated user
            User currentUser = getCurrentUser();
            log.info("📴 Photo submission attempt by user ID: {} ({})", currentUser.getId(), currentUser.getEmail());

            // 🛠️ ENHANCED: Validate inputs with detailed logging
            if (file == null || file.isEmpty()) {
                log.warn("📴 File validation failed: file is null or empty");
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "File is required and cannot be empty"
                ));
            }

            if (description == null || description.trim().isEmpty()) {
                log.warn("📴 Description validation failed: description is null or empty");
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "Description is required and cannot be empty"
                ));
            }

            if (description.trim().length() > 500) {
                log.warn("📴 Description validation failed: too long ({} chars)", description.length());
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "Description must be less than 500 characters"
                ));
            }

            // 🛠️ ENHANCED: Validate file with detailed checks
            if (!isValidImageFile(file)) {
                log.warn("📴 File type validation failed: {}", file.getContentType());
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed. Current type: " + file.getContentType()
                ));
            }

            // Check file size (5MB limit)
            if (file.getSize() > 5 * 1024 * 1024) {
                log.warn("📴 File size validation failed: {} bytes", file.getSize());
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", String.format("File size must be less than 5MB. Current size: %.2f MB",
                                file.getSize() / 1024.0 / 1024.0)
                ));
            }

            log.info("✅ All validations passed. Proceeding with S3 upload...");

            // 🛠️ ENHANCED: Upload to S3 with better error handling
            String s3Url;
            try {
                s3Url = s3Service.uploadFile(file);
                log.info("✅ File uploaded to S3 successfully: {}", s3Url);
            } catch (IOException e) {
                log.error("📴 S3 upload failed for user {}: {}", currentUser.getId(), e.getMessage(), e);
                return ResponseEntity.status(500).body(Map.of(
                        "success", false,
                        "message", "Failed to upload file to S3: " + e.getMessage(),
                        "details", "Check S3 configuration and AWS credentials"
                ));
            } catch (Exception e) {
                log.error("📴 Unexpected error during S3 upload: {}", e.getMessage(), e);
                return ResponseEntity.status(500).body(Map.of(
                        "success", false,
                        "message", "Unexpected error during file upload: " + e.getMessage()
                ));
            }

            // 🛠️ ENHANCED: Create photo entry with better validation
            Photo photo;
            try {
                photo = Photo.builder()
                        .s3Url(s3Url)
                        .fileName(sanitizeFilename(file.getOriginalFilename()))
                        .description(sanitizeInput(description.trim()))
                        .size(file.getSize())
                        .status(Photo.PhotoStatus.SUBMITTED)
                        .user(currentUser)
                        .build();

                Photo savedPhoto = photoRepository.save(photo);
                log.info("✅ Photo saved to database with ID: {}", savedPhoto.getId());

                // 🛠️ ENHANCED: Award coins with error handling
                try {
                    walletService.awardCoins(
                            currentUser.getId(),
                            java.math.BigDecimal.valueOf(25),
                            CoinTransaction.TransactionCategory.PHOTO_UPLOAD,
                            "Photo upload: " + description.trim()
                    );
                    log.info("✅ Awarded 25 coins to user {} for photo upload", currentUser.getId());
                } catch (Exception e) {
                    log.error("⚠️ Failed to award coins for photo upload: {}", e.getMessage());
                    // Don't fail the entire operation if coin awarding fails
                }

                // 🛠️ ENHANCED: Send notification with error handling
                try {
                    notificationService.notifyPhotoUploaded(currentUser, savedPhoto);
                    log.info("✅ Notification sent for photo upload");
                } catch (Exception e) {
                    log.error("⚠️ Failed to send notification: {}", e.getMessage());
                    // Don't fail the entire operation if notification fails
                }

                // 🛠️ SUCCESS: Return comprehensive response
                Map<String, Object> response = new HashMap<>();
                response.put("success", true);
                response.put("message", "Photo submitted successfully and entered into lottery!");
                response.put("photo", createPhotoResponse(savedPhoto));
                response.put("coinsEarned", 25);

                log.info("🎉 Photo submission completed successfully for user {}", currentUser.getId());
                return ResponseEntity.ok(response);

            } catch (Exception e) {
                log.error("📴 Database error during photo save: {}", e.getMessage(), e);
                return ResponseEntity.status(500).body(Map.of(
                        "success", false,
                        "message", "Failed to save photo to database: " + e.getMessage(),
                        "s3Url", s3Url, // Include S3 URL for debugging
                        "details", "Photo was uploaded to S3 but failed to save to database"
                ));
            }

        } catch (Exception e) {
            log.error("📴 Unexpected error in photo submission: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "message", "Photo submission failed due to unexpected error: " + e.getMessage(),
                    "error", e.getClass().getSimpleName()
            ));
        }
    }

    /**
     * 🛠️ ENHANCED: Get all photos for the authenticated user
     */
    @GetMapping("/my-photos")
    @Operation(summary = "Get user's photos", description = "Retrieve all photos uploaded by the current user")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<?> getMyPhotos() {
        try {
            User currentUser = getCurrentUser();
            log.info("📸 Loading photos for user: {} ({})", currentUser.getId(), currentUser.getEmail());

            List<Photo> userPhotos = photoRepository.findByUserId(currentUser.getId());
            log.info("📸 Found {} photos for user {}", userPhotos.size(), currentUser.getId());

            List<Map<String, Object>> photoData = userPhotos.stream()
                    .map(this::createPhotoResponse)
                    .collect(Collectors.toList());

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "photos", photoData,
                    "totalCount", photoData.size()
            ));

        } catch (Exception e) {
            log.error("📴 Failed to get user photos: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "message", "Failed to retrieve photos: " + e.getMessage()
            ));
        }
    }

    /**
     * 🛠️ ENHANCED: Get photos by specific user ID
     */
    @GetMapping("/user/{userId}")
    @Operation(summary = "Get photos by user ID", description = "Retrieve all photos for a specific user")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<?> getPhotosByUserId(@PathVariable Long userId) {
        try {
            log.info("📸 Loading photos for user ID: {}", userId);

            // Verify user exists
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found with ID: " + userId));

            // Get user's photos
            List<Photo> userPhotos = photoRepository.findByUserId(userId);
            log.info("📸 Found {} photos for user ID: {}", userPhotos.size(), userId);

            List<Map<String, Object>> photoData = userPhotos.stream()
                    .map(this::createPhotoResponse)
                    .collect(Collectors.toList());

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "photos", photoData,
                    "totalCount", photoData.size(),
                    "userId", userId,
                    "userName", user.getName()
            ));

        } catch (Exception e) {
            log.error("📴 Failed to get user photos for ID {}: {}", userId, e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "message", "Failed to retrieve photos for user: " + e.getMessage()
            ));
        }
    }

    /**
     * Get all photos submitted to the lottery (PUBLIC ENDPOINT)
     */
    @GetMapping("/lottery")
    @Operation(summary = "Get all lottery photos", description = "Retrieve all submitted photos for the lottery")
    public ResponseEntity<?> getAllLotteryPhotos() {
        try {
            log.info("🎰 Loading all lottery photos");
            List<Photo> allPhotos = photoRepository.findAll();

            List<Map<String, Object>> photoData = allPhotos.stream()
                    .filter(photo -> photo.getStatus() != null)
                    .map(this::createPhotoResponse)
                    .collect(Collectors.toList());

            log.info("🎰 Retrieved {} lottery photos", photoData.size());

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "photos", photoData,
                    "totalCount", photoData.size()
            ));

        } catch (Exception e) {
            log.error("📴 Failed to get lottery photos: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "message", "Failed to retrieve lottery photos: " + e.getMessage()
            ));
        }
    }

    /**
     * Get the current lottery winner (PUBLIC ENDPOINT) - FIXED NULL POINTER EXCEPTION
     */
    @GetMapping("/current-winner")
    @Operation(summary = "Get current lottery winner", description = "Retrieve the current lottery winner")
    public ResponseEntity<?> getCurrentWinner() {
        try {
            List<Photo> winners = photoRepository.findByStatus(Photo.PhotoStatus.WINNER);

            if (winners.isEmpty()) {
                // FIX: Use HashMap instead of Map.of() to handle null values
                Map<String, Object> response = new HashMap<>();
                response.put("success", true);
                response.put("winner", null);  // HashMap allows null values
                response.put("message", "No winner selected yet");
                return ResponseEntity.ok(response);
            }

            // Get the most recent winner (last in the list)
            Photo currentWinner = winners.get(winners.size() - 1);

            // Check for null winner or user
            if (currentWinner == null || currentWinner.getUser() == null) {
                log.warn("🏆 A winning photo was found but is missing essential data (photo or user is null).");

                // Use HashMap for error response too
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("message", "A winner was found but is missing data.");
                return ResponseEntity.status(500).body(errorResponse);
            }

            log.info("🏆 Current winner is photo ID: {}", currentWinner.getId());

            // Use HashMap for successful response with winner data
            Map<String, Object> successResponse = new HashMap<>();
            successResponse.put("success", true);
            successResponse.put("winner", createPhotoResponse(currentWinner));
            return ResponseEntity.ok(successResponse);

        } catch (Exception e) {
            log.error("📴 Failed to get current winner: {}", e.getMessage(), e);

            // Use HashMap for exception response
            Map<String, Object> exceptionResponse = new HashMap<>();
            exceptionResponse.put("success", false);
            exceptionResponse.put("message", "Failed to retrieve winner: " + e.getMessage());
            return ResponseEntity.status(500).body(exceptionResponse);
        }
    }

    /**
     * 🛠️ ENHANCED: Spin the lottery and select a random winner
     */
    @PostMapping("/spin-lottery")
    @Operation(summary = "Spin the lottery", description = "Randomly select a winner from submitted photos")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<?> spinLottery() {
        try {
            // Get all submitted photos (exclude current winners)
            List<Photo> submittedPhotos = photoRepository.findByStatus(Photo.PhotoStatus.SUBMITTED);

            if (submittedPhotos.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "No photos available for lottery draw"
                ));
            }

            log.info("🎰 Spinning lottery with {} submitted photos", submittedPhotos.size());

            // Reset previous winners to SUBMITTED status
            List<Photo> previousWinners = photoRepository.findByStatus(Photo.PhotoStatus.WINNER);
            for (Photo prevWinner : previousWinners) {
                prevWinner.setStatus(Photo.PhotoStatus.SUBMITTED);
                photoRepository.save(prevWinner);
                log.info("🔄 Reset previous winner photo ID {} to SUBMITTED", prevWinner.getId());
            }

            // Randomly select a winner
            Random random = new Random();
            int winnerIndex = random.nextInt(submittedPhotos.size());
            Photo winner = submittedPhotos.get(winnerIndex);

            // Update winner status
            winner.setStatus(Photo.PhotoStatus.WINNER);
            Photo savedWinner = photoRepository.save(winner);

            log.info("🎉 Lottery winner selected: Photo ID {} by user {}",
                    savedWinner.getId(), savedWinner.getUser().getName());

            // Send winner and result notifications
            try {
                notificationService.notifyLotteryWinner(savedWinner.getUser(), savedWinner);
                notificationService.notifyLotteryResult(savedWinner);
                log.info("✅ Winner notifications sent");
            } catch (Exception e) {
                log.error("⚠️ Failed to send winner notifications: {}", e.getMessage());
            }

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "winner", createPhotoResponse(savedWinner),
                    "message", "Winner selected successfully!"
            ));

        } catch (Exception e) {
            log.error("📴 Lottery spin failed: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "message", "Failed to spin lottery: " + e.getMessage()
            ));
        }
    }

    /**
     * 🛠️ ENHANCED: Delete a photo with better security
     */
    @DeleteMapping("/{photoId}")
    @Operation(summary = "Delete photo", description = "Delete a photo (only the owner can delete)")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<?> deletePhoto(@PathVariable Long photoId) {
        try {
            User currentUser = getCurrentUser();
            log.info("🗑️ Delete request for photo {} by user {}", photoId, currentUser.getId());

            Photo photo = photoRepository.findById(photoId)
                    .orElseThrow(() -> new RuntimeException("Photo not found with ID: " + photoId));

            // Verify photo belongs to current user
            if (!Objects.equals(photo.getUser().getId(), currentUser.getId())) {
                log.warn("🚫 User {} attempted to delete photo {} owned by user {}",
                        currentUser.getId(), photoId, photo.getUser().getId());
                return ResponseEntity.status(403).body(Map.of(
                        "success", false,
                        "message", "Access denied: You can only delete your own photos"
                ));
            }

            // Delete from database (S3 file will remain for backup purposes)
            photoRepository.delete(photo);
            log.info("✅ Photo deleted successfully: {} by user {}", photoId, currentUser.getId());

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Photo deleted successfully"
            ));

        } catch (Exception e) {
            log.error("📴 Failed to delete photo {}: {}", photoId, e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "message", "Failed to delete photo: " + e.getMessage()
            ));
        }
    }

    // ==================== UTILITY METHODS ====================

    /**
     * Get the currently authenticated user
     */
    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new RuntimeException("User not authenticated");
        }

        String email = authentication.getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found: " + email));
    }

    /**
     * 🛠️ ENHANCED: Validate if the uploaded file is a valid image
     */
    private boolean isValidImageFile(MultipartFile file) {
        String contentType = file.getContentType();
        if (contentType == null) {
            log.warn("📴 File has no content type");
            return false;
        }

        boolean isValid = contentType.equals("image/jpeg") ||
                contentType.equals("image/jpg") ||
                contentType.equals("image/png") ||
                contentType.equals("image/gif") ||
                contentType.equals("image/webp");

        log.info("🔍 File validation: {} -> {}", contentType, isValid ? "VALID" : "INVALID");
        return isValid;
    }

    /**
     * Sanitize user input to prevent XSS attacks
     */
    private String sanitizeInput(String input) {
        if (input == null) return "";
        return input.replaceAll("[<>\"'&]", "").trim();
    }

    /**
     * Sanitize filename for safe storage
     */
    private String sanitizeFilename(String filename) {
        if (filename == null) return "image";
        return filename.replaceAll("[^a-zA-Z0-9.\\-_]", "_");
    }

    /**
     * 🛠️ ENHANCED: Create a response object for a photo
     */
    private Map<String, Object> createPhotoResponse(Photo photo) {
        Map<String, Object> photoMap = new HashMap<>();
        photoMap.put("id", photo.getId());
        photoMap.put("s3Url", photo.getS3Url());
        photoMap.put("image", photo.getS3Url()); // Alias for frontend compatibility
        photoMap.put("filename", photo.getFileName());
        photoMap.put("description", photo.getDescription());
        photoMap.put("status", photo.getStatus() != null ? photo.getStatus().toString() : "UNKNOWN");
        photoMap.put("size", photo.getSize());
        photoMap.put("uploadDate", photo.getUploadDate() != null ?
                photo.getUploadDate().toString() : "Unknown");

        if (photo.getUser() != null) {
            photoMap.put("submittedBy", photo.getUser().getName());
            photoMap.put("user", photo.getUser().getName()); // Alias for frontend
            photoMap.put("userId", photo.getUser().getId());
        } else {
            photoMap.put("submittedBy", "Unknown");
            photoMap.put("user", "Unknown");
            photoMap.put("userId", null);
        }

        return photoMap;
    }
}