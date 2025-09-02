package Bitcoin.Building.up.a.Bitcoin.application;
import Bitcoin.Building.up.a.Bitcoin.application.PhotoStatus;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.text.Normalizer;
import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PhotoRepository photoRepository;
    private final S3Service s3Service;
    private final WalletService walletService;

    @Transactional
    public User registerUser(User user, MultipartFile image) throws Exception {
        try {
            // 0) Validate input image (optional but safer)
            if (image == null || image.isEmpty()) {
                throw new IllegalArgumentException("Image file is required");
            }

            // 1) Save user first to get an ID
            User savedUser = userRepository.save(user);
            log.info("User saved to database with ID: {}", savedUser.getId());

            // 2) Upload image to S3
            String s3Url = s3Service.uploadFile(image);
            log.info("Photo uploaded to S3: {}", s3Url);

            // 3) Create and save Photo entity (uses enum + fileName field)
            String safeFileName = sanitizeFilename(image.getOriginalFilename());

            Photo photo = Photo.builder()
                    .s3Url(s3Url)                               // matches Photo.s3Url
                    .fileName(safeFileName)                     // new column in Photo
                    .description("Profile Photo")
                    .size(image.getSize())
                    .status(PhotoStatus.IN_DRAW)                // new enum: photo enters the current draw
                    // enum, not String
                    .user(savedUser)
                    .uploadDate(LocalDateTime.now())
                    .build();

            Photo savedPhoto = photoRepository.save(photo);
            log.info("Photo saved to database with ID: {}", savedPhoto.getId());

            // 4) Award coins (don’t fail whole flow if this part fails)
            try {
                walletService.awardCoins(
                        savedUser.getId(),
                        java.math.BigDecimal.valueOf(25),
                        CoinTransaction.TransactionCategory.PHOTO_UPLOAD,
                        "Photo upload: " + savedPhoto.getDescription()
                );
                log.info("✅ Awarded 25 coins to user {} for photo upload", savedUser.getId());
            } catch (Exception e) {
                log.warn("⚠️ Failed to award coins for photo upload: {}", e.getMessage());
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
     * Sanitize filename for safe display/storage in DB (not used as S3 key).
     * - Strips path parts
     * - Normalizes accents
     * - Keeps letters/digits/._- only
     */
    private String sanitizeFilename(String filename) {
        if (filename == null || filename.isBlank()) return "file";

        // remove any path segments
        String name = filename.replace("\\", "/");
        int slash = name.lastIndexOf('/');
        if (slash >= 0) name = name.substring(slash + 1);

        // normalize accents and strip combining marks
        name = Normalizer.normalize(name, Normalizer.Form.NFKD)
                .replaceAll("\\p{M}+", "");

        // keep safe chars
        name = name.replaceAll("[^A-Za-z0-9._-]", "_");

        if (name.isBlank() || name.equals(".") || name.equals("..")) {
            name = "file";
        }

        // cap length ~200 while preserving extension if present
        if (name.length() > 200) {
            int dot = name.lastIndexOf('.');
            if (dot > 0 && dot < name.length() - 1) {
                String base = name.substring(0, Math.min(dot, 180));
                String ext  = name.substring(dot);
                name = base + ext;
            } else {
                name = name.substring(0, 200);
            }
        }
        return name;
    }
}
