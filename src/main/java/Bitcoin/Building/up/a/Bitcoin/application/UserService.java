package Bitcoin.Building.up.a.Bitcoin.application;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;
    private final PhotoRepository photoRepository;
    private final S3Service s3Service;
    private final WalletService walletService;
    private final CoinTransactionRepository coinTransactionRepository;

    @Transactional
    public User registerUser(User user, MultipartFile image) throws Exception {
        try {
            // Save user first to get ID
            User savedUser = userRepository.save(user);
            log.info("User saved to database with ID: {}", savedUser.getId());

            // Upload image to S3
            String s3Url = s3Service.uploadFile(image);
            log.info("Photo uploaded to S3: {}", s3Url);

            // Create and save photo
            Photo photo = Photo.builder()
                    .s3Url(s3Url)  // This matches your column name "s3url"
                    .fileName(sanitizeFilename(image.getOriginalFilename()))
                    .description("Profile Photo")
                    .size(image.getSize())
                    .status(Photo.PhotoStatus.SUBMITTED)
                    .user(savedUser)
                    .uploadDate(LocalDateTime.now())  // Add this
                    .build();

            Photo savedPhoto = photoRepository.save(photo);
            log.info("Photo saved to database with ID: {}", savedPhoto.getId());

            // Award coins with error handling
            try {
                walletService.awardCoins(
                        savedUser.getId(),
                        java.math.BigDecimal.valueOf(25),
                        CoinTransaction.TransactionCategory.PHOTO_UPLOAD,
                        "Photo upload: " + savedPhoto.getDescription()
                );
                log.info("✅ Awarded 25 coins to user {} for photo upload", savedUser.getId());
            } catch (Exception e) {
                log.error("⚠️ Failed to award coins for photo upload: {}", e.getMessage());
                // Don't fail the entire operation if coin awarding fails
            }

            return savedUser;

        } catch (Exception e) {
            log.error("Failed to register user: {}", e.getMessage(), e);
            throw new Exception("Failed to register user: " + e.getMessage(), e);
        }
    }

    public boolean testS3Connection() {
        return s3Service.testConnection();
    }

    /**
     * Sanitize filename for safe storage
     */
    private String sanitizeFilename(String filename) {
        if (filename == null) return "image";
        return filename.replaceAll("[^a-zA-Z0-9.\\-_]", "_");
    }
}