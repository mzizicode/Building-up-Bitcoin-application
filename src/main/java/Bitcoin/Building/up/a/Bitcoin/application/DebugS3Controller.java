package Bitcoin.Building.up.a.Bitcoin.application;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.Bucket;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/debug")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class DebugS3Controller {

    @Value("${aws.bucket.name}")
    private String bucketName;

    @Value("${aws.access.key}")
    private String accessKey;

    @Value("${aws.secret.key}")
    private String secretKey;

    @Value("${aws.region}")
    private String region;

    @GetMapping("/s3-config")
    public ResponseEntity<?> checkS3Config() {
        Map<String, Object> config = new HashMap<>();

        config.put("bucketName", bucketName);
        config.put("region", region);
        config.put("accessKeyLength", accessKey != null ? accessKey.length() : 0);
        config.put("secretKeyLength", secretKey != null ? secretKey.length() : 0);
        config.put("accessKeyPrefix", accessKey != null && accessKey.length() > 4 ?
                accessKey.substring(0, 4) + "..." : "too short");

        return ResponseEntity.ok(config);
    }

    @GetMapping("/s3-test")
    public ResponseEntity<?> testS3() {
        try {
            log.info("Testing S3 connection...");

            AwsBasicCredentials awsCredentials = AwsBasicCredentials.create(
                    accessKey.trim(),
                    secretKey.trim()
            );

            S3Client s3Client = S3Client.builder()
                    .region(Region.of(region.trim()))
                    .credentialsProvider(StaticCredentialsProvider.create(awsCredentials))
                    .build();

            // List all buckets
            var bucketsResponse = s3Client.listBuckets();
            List<String> bucketNames = bucketsResponse.buckets().stream()
                    .map(Bucket::name)
                    .collect(Collectors.toList());

            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("message", "S3 connection successful");
            result.put("totalBuckets", bucketNames.size());
            result.put("allBuckets", bucketNames);
            result.put("targetBucket", bucketName);
            result.put("targetBucketExists", bucketNames.contains(bucketName));

            return ResponseEntity.ok(result);

        } catch (Exception e) {
            log.error("S3 test failed", e);

            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", e.getMessage());
            error.put("errorType", e.getClass().getSimpleName());

            return ResponseEntity.status(500).body(error);
        }
    }
}