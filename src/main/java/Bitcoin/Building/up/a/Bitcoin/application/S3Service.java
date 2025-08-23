package Bitcoin.Building.up.a.Bitcoin.application;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class S3Service {

    @Value("${aws.bucket.name}")
    private String bucketName;

    @Value("${aws.access.key}")
    private String accessKey;

    @Value("${aws.secret.key}")
    private String secretKey;

    @Value("${aws.region}")
    private String region;

    /**
     * 🛠️ COMPLETELY FIXED: Upload file to S3 with comprehensive error handling
     */
    public String uploadFile(MultipartFile file) throws IOException {
        log.info("🚀 Starting S3 upload. File: {}, Size: {} bytes, Type: {}",
                file.getOriginalFilename(), file.getSize(), file.getContentType());

        // 🛠️ ENHANCED: Validate configuration with detailed logging
        validateConfiguration();

        // 🛠️ ENHANCED: Validate file with detailed checks
        validateFile(file);

        S3Client s3Client = null;
        try {
            // 🛠️ ENHANCED: Create S3 client with better error handling
            s3Client = createS3Client();

            // 🛠️ ENHANCED: Generate unique, safe filename
            String filename = generateSafeFilename(file);
            log.info("📁 Generated S3 filename: {}", filename);

            // 🛠️ ENHANCED: Upload with detailed progress logging
            uploadToS3(s3Client, file, filename);

            // 🛠️ ENHANCED: Generate and verify URL
            String fileUrl = generatePublicUrl(filename);
            log.info("✅ S3 upload completed successfully: {}", fileUrl);

            return fileUrl;

        } catch (S3Exception e) {
            log.error("🔴 S3 service error during upload: Code: {}, Message: {}",
                    e.awsErrorDetails().errorCode(), e.awsErrorDetails().errorMessage());
            throw new IOException(mapS3Error(e), e);
        } catch (Exception e) {
            log.error("🔴 Unexpected error during S3 upload: {}", e.getMessage(), e);
            throw new IOException("S3 upload failed: " + e.getMessage(), e);
        } finally {
            if (s3Client != null) {
                try {
                    s3Client.close();
                    log.debug("🔧 S3 client closed successfully");
                } catch (Exception e) {
                    log.warn("⚠️ Error closing S3 client: {}", e.getMessage());
                }
            }
        }
    }

    /**
     * 🛠️ NEW: Validate AWS configuration
     */
    private void validateConfiguration() throws IOException {
        log.debug("🔧 Validating AWS S3 configuration...");

        if (accessKey == null || accessKey.trim().isEmpty()) {
            throw new IOException("AWS Access Key is not configured or empty");
        }
        if (secretKey == null || secretKey.trim().isEmpty()) {
            throw new IOException("AWS Secret Key is not configured or empty");
        }
        if (bucketName == null || bucketName.trim().isEmpty()) {
            throw new IOException("AWS Bucket Name is not configured or empty");
        }
        if (region == null || region.trim().isEmpty()) {
            throw new IOException("AWS Region is not configured or empty");
        }

        // Log sanitized configuration for debugging
        log.info("🔧 S3 Config - Bucket: {}, Region: {}, Access Key: {}***",
                bucketName, region, accessKey.length() > 4 ? accessKey.substring(0, 4) : "SHORT");
    }

    /**
     * 🛠️ NEW: Validate uploaded file
     */
    private void validateFile(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IOException("File is null or empty");
        }

        if (file.getSize() == 0) {
            throw new IOException("File has zero size - may be corrupted");
        }

        if (file.getSize() > 10 * 1024 * 1024) { // 10MB limit
            throw new IOException(String.format("File size too large: %.2f MB (max 10MB)",
                    file.getSize() / 1024.0 / 1024.0));
        }

        String contentType = file.getContentType();
        if (contentType == null || !isValidImageType(contentType)) {
            throw new IOException("Invalid file type: " + contentType +
                    ". Only JPEG, PNG, GIF, and WebP images are allowed");
        }

        log.info("✅ File validation passed: {} ({})", file.getOriginalFilename(), contentType);
    }

    /**
     * 🛠️ NEW: Check if content type is a valid image
     */
    private boolean isValidImageType(String contentType) {
        return contentType.equals("image/jpeg") ||
                contentType.equals("image/jpg") ||
                contentType.equals("image/png") ||
                contentType.equals("image/gif") ||
                contentType.equals("image/webp");
    }

    /**
     * 🛠️ NEW: Create S3 client with comprehensive error handling
     */
    private S3Client createS3Client() throws IOException {
        try {
            log.debug("🔧 Creating S3 client...");

            AwsBasicCredentials awsCredentials = AwsBasicCredentials.create(
                    accessKey.trim(),
                    secretKey.trim()
            );

            S3Client s3Client = S3Client.builder()
                    .region(Region.of(region.trim()))
                    .credentialsProvider(StaticCredentialsProvider.create(awsCredentials))
                    .build();

            // 🛠️ ENHANCED: Test connection by checking bucket access
            testS3Connection(s3Client);

            log.info("✅ S3 client created and validated successfully");
            return s3Client;

        } catch (S3Exception e) {
            log.error("🔴 S3 authentication failed: {}", e.awsErrorDetails().errorMessage());
            throw new IOException("S3 authentication failed: " + mapS3Error(e), e);
        } catch (Exception e) {
            log.error("🔴 Failed to create S3 client: {}", e.getMessage(), e);
            throw new IOException("Failed to create S3 client: " + e.getMessage(), e);
        }
    }

    /**
     * 🛠️ NEW: Test S3 connection and permissions
     */
    private void testS3Connection(S3Client s3Client) throws IOException {
        try {
            log.debug("🔧 Testing S3 connection and bucket access...");

            // Try to head the bucket to check if it exists and we have access
            HeadBucketRequest headBucketRequest = HeadBucketRequest.builder()
                    .bucket(bucketName.trim())
                    .build();

            s3Client.headBucket(headBucketRequest);
            log.info("✅ S3 bucket access verified: {}", bucketName);

        } catch (NoSuchBucketException e) {
            throw new IOException("S3 bucket '" + bucketName + "' does not exist");
        } catch (S3Exception e) {
            String errorCode = e.awsErrorDetails().errorCode();
            if ("AccessDenied".equals(errorCode)) {
                throw new IOException("Access denied to S3 bucket '" + bucketName + "'. Check IAM permissions.");
            } else if ("InvalidAccessKeyId".equals(errorCode)) {
                throw new IOException("Invalid AWS Access Key ID. Please check your credentials.");
            } else if ("SignatureDoesNotMatch".equals(errorCode)) {
                throw new IOException("Invalid AWS Secret Key. Please check your credentials.");
            } else {
                throw new IOException("S3 connection test failed: " + e.awsErrorDetails().errorMessage());
            }
        }
    }

    /**
     * 🛠️ NEW: Generate safe, unique filename
     */
    private String generateSafeFilename(MultipartFile file) {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
        String uniqueId = UUID.randomUUID().toString().substring(0, 8);
        String originalFilename = file.getOriginalFilename();

        // Extract and validate file extension
        String fileExtension = "";
        if (originalFilename != null && originalFilename.contains(".")) {
            fileExtension = originalFilename.substring(originalFilename.lastIndexOf("."));
        } else {
            // Default extension based on content type
            String contentType = file.getContentType();
            if ("image/jpeg".equals(contentType)) fileExtension = ".jpg";
            else if ("image/png".equals(contentType)) fileExtension = ".png";
            else if ("image/gif".equals(contentType)) fileExtension = ".gif";
            else if ("image/webp".equals(contentType)) fileExtension = ".webp";
            else fileExtension = ".img";
        }

        // Sanitize original filename
        String sanitizedName = originalFilename != null ?
                originalFilename.replaceAll("[^a-zA-Z0-9.]", "_") : "photo";
        if (sanitizedName.contains(".")) {
            sanitizedName = sanitizedName.substring(0, sanitizedName.lastIndexOf("."));
        }

        return String.format("photos/%s_%s_%s%s", timestamp, uniqueId, sanitizedName, fileExtension);
    }

    /**
     * 🛠️ NEW: Upload file to S3 with detailed progress
     */
    private void uploadToS3(S3Client s3Client, MultipartFile file, String filename) throws IOException {
        try {
            log.info("📤 Uploading to S3: bucket={}, key={}", bucketName, filename);

            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                    .bucket(bucketName.trim())
                    .key(filename)
                    .contentType(file.getContentType())
                    .contentLength(file.getSize())
                    .cacheControl("max-age=31536000") // 1 year cache
                    .build();

            PutObjectResponse response = s3Client.putObject(putObjectRequest,
                    RequestBody.fromBytes(file.getBytes()));

            log.info("✅ S3 upload successful. ETag: {}", response.eTag());

        } catch (IOException e) {
            log.error("🔴 Error reading file bytes: {}", e.getMessage());
            throw new IOException("Failed to read file for upload: " + e.getMessage(), e);
        } catch (S3Exception e) {
            log.error("🔴 S3 upload failed: Code: {}, Message: {}",
                    e.awsErrorDetails().errorCode(), e.awsErrorDetails().errorMessage());
            throw new IOException("S3 upload failed: " + mapS3Error(e), e);
        }
    }

    /**
     * 🛠️ NEW: Generate public URL for uploaded file
     */
    private String generatePublicUrl(String filename) {
        return String.format("https://%s.s3.%s.amazonaws.com/%s",
                bucketName.trim(), region.trim(), filename);
    }

    /**
     * 🛠️ NEW: Map S3 errors to user-friendly messages
     */
    private String mapS3Error(S3Exception e) {
        String errorCode = e.awsErrorDetails().errorCode();
        String errorMessage = e.awsErrorDetails().errorMessage();

        return switch (errorCode) {
            case "SignatureDoesNotMatch" -> "Invalid AWS credentials. Please check your access key and secret key.";
            case "InvalidAccessKeyId" -> "Invalid AWS Access Key ID. Please verify your credentials.";
            case "NoSuchBucket" -> "S3 bucket '" + bucketName + "' does not exist. Please check the bucket name.";
            case "AccessDenied" -> "Access denied to S3 bucket. Please check your IAM permissions.";
            case "EntityTooLarge" -> "File is too large for S3 upload.";
            case "InvalidRequest" -> "Invalid S3 request: " + errorMessage;
            case "ServiceUnavailable" -> "S3 service is temporarily unavailable. Please try again.";
            case "RequestTimeout" -> "S3 request timed out. Please try again.";
            default -> "S3 error (" + errorCode + "): " + errorMessage;
        };
    }

    /**
     * 🛠️ ENHANCED: Test S3 connection (public method)
     */
    public boolean testConnection() {
        try {
            log.info("🧪 Testing S3 connection...");
            validateConfiguration();

            S3Client s3Client = createS3Client();
            try {
                testS3Connection(s3Client);
                log.info("✅ S3 connection test successful");
                return true;
            } finally {
                s3Client.close();
            }

        } catch (Exception e) {
            log.error("🔴 S3 connection test failed: {}", e.getMessage());
            return false;
        }
    }

    /**
     * 🛠️ NEW: Delete file from S3 (for cleanup if needed)
     */
    public boolean deleteFile(String s3Url) {
        try {
            String filename = extractFilenameFromUrl(s3Url);
            if (filename == null) {
                log.warn("⚠️ Could not extract filename from URL: {}", s3Url);
                return false;
            }

            S3Client s3Client = createS3Client();
            try {
                DeleteObjectRequest deleteRequest = DeleteObjectRequest.builder()
                        .bucket(bucketName.trim())
                        .key(filename)
                        .build();

                s3Client.deleteObject(deleteRequest);
                log.info("🗑️ Deleted file from S3: {}", filename);
                return true;

            } finally {
                s3Client.close();
            }

        } catch (Exception e) {
            log.error("🔴 Failed to delete file from S3: {}", e.getMessage());
            return false;
        }
    }

    /**
     * 🛠️ NEW: Extract filename from S3 URL
     */
    private String extractFilenameFromUrl(String s3Url) {
        try {
            String expectedPrefix = String.format("https://%s.s3.%s.amazonaws.com/", bucketName, region);
            if (s3Url.startsWith(expectedPrefix)) {
                return s3Url.substring(expectedPrefix.length());
            }
            return null;
        } catch (Exception e) {
            log.error("🔴 Error extracting filename from URL: {}", e.getMessage());
            return null;
        }
    }
}