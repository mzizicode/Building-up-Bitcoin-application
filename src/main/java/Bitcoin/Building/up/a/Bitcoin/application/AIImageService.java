package Bitcoin.Building.up.a.Bitcoin.application;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class AIImageService {

    @Value("${openai.api.key}")
    private String openaiApiKey;

    private final RestTemplate restTemplate = new RestTemplate();

    public String generateDescription(MultipartFile imageFile) {
        try {
            log.info("Generating AI description for image: {}", imageFile.getOriginalFilename());

            // Validate inputs
            if (imageFile == null || imageFile.isEmpty()) {
                log.warn("Image file is null or empty");
                return "Prize Item";
            }

            if (openaiApiKey == null || openaiApiKey.trim().isEmpty()) {
                log.warn("OpenAI API key not configured");
                return generateFallbackDescription(imageFile.getOriginalFilename());
            }

            // Convert image to base64
            String base64Image = Base64.getEncoder().encodeToString(imageFile.getBytes());
            String mimeType = imageFile.getContentType();

            // Prepare OpenAI Vision API request
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", "gpt-4-vision-preview");
            requestBody.put("max_tokens", 100);

            List<Map<String, Object>> messages = new ArrayList<>();
            Map<String, Object> message = new HashMap<>();
            message.put("role", "user");

            List<Object> content = new ArrayList<>();

            // Text prompt
            Map<String, Object> textContent = new HashMap<>();
            textContent.put("type", "text");
            textContent.put("text", "Describe this image in 2-4 words, focusing on the main object or product. Be concise and specific. Examples: 'Red iPhone 14', 'Nike Running Shoes', 'Gaming Laptop', 'Wireless Headphones'. Focus on brand, color, or key features.");
            content.add(textContent);

            // Image content
            Map<String, Object> imageContent = new HashMap<>();
            imageContent.put("type", "image_url");
            Map<String, Object> imageUrl = new HashMap<>();
            imageUrl.put("url", "data:" + mimeType + ";base64," + base64Image);
            imageContent.put("image_url", imageUrl);
            content.add(imageContent);

            message.put("content", content);
            messages.add(message);
            requestBody.put("messages", messages);

            // Set up headers
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(openaiApiKey.trim());

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            log.debug("Making OpenAI API call...");

            // Make API call to OpenAI
            ResponseEntity<Map> response = restTemplate.postForEntity(
                    "https://api.openai.com/v1/chat/completions",
                    entity,
                    Map.class
            );

            if (response.getStatusCode() == HttpStatus.OK) {
                Map<String, Object> responseBody = response.getBody();
                if (responseBody != null) {
                    List<Map<String, Object>> choices = (List<Map<String, Object>>) responseBody.get("choices");

                    if (choices != null && !choices.isEmpty()) {
                        Map<String, Object> choice = choices.get(0);
                        Map<String, Object> messageResponse = (Map<String, Object>) choice.get("message");
                        String description = (String) messageResponse.get("content");

                        if (description != null && !description.trim().isEmpty()) {
                            String cleanDescription = description.trim();
                            log.info("AI generated description: '{}'", cleanDescription);
                            return cleanDescription;
                        }
                    }
                }
            }

            log.warn("OpenAI API returned unexpected response structure: {}", response.getBody());
            return generateFallbackDescription(imageFile.getOriginalFilename());

        } catch (Exception e) {
            log.error("Failed to generate AI description: {}", e.getMessage());
            return generateFallbackDescription(imageFile.getOriginalFilename());
        }
    }

    /**
     * Generate fallback description based on filename
     */
    private String generateFallbackDescription(String filename) {
        if (filename == null || filename.trim().isEmpty()) {
            return "Prize Item";
        }

        String lower = filename.toLowerCase();

        // Check for common product keywords in filename
        if (lower.contains("iphone") || lower.contains("phone")) {
            return "Smartphone";
        } else if (lower.contains("laptop") || lower.contains("computer")) {
            return "Laptop Computer";
        } else if (lower.contains("headphone") || lower.contains("earphone") || lower.contains("airpods")) {
            return "Wireless Headphones";
        } else if (lower.contains("watch") || lower.contains("smartwatch")) {
            return "Smart Watch";
        } else if (lower.contains("shoe") || lower.contains("sneaker") || lower.contains("nike") || lower.contains("adidas")) {
            return "Running Shoes";
        } else if (lower.contains("tablet") || lower.contains("ipad")) {
            return "Tablet Device";
        } else if (lower.contains("camera")) {
            return "Digital Camera";
        } else if (lower.contains("game") || lower.contains("gaming")) {
            return "Gaming Device";
        } else if (lower.contains("book")) {
            return "Book Collection";
        } else if (lower.contains("gift") || lower.contains("card")) {
            return "Gift Card";
        } else {
            return "Prize Item";
        }
    }

    /**
     * Test OpenAI connection
     */
    public boolean testConnection() {
        try {
            if (openaiApiKey == null || openaiApiKey.trim().isEmpty()) {
                log.warn("OpenAI API key not configured");
                return false;
            }

            // Simple test request
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", "gpt-3.5-turbo");
            requestBody.put("messages", List.of(
                    Map.of("role", "user", "content", "Hello")
            ));
            requestBody.put("max_tokens", 5);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(openaiApiKey.trim());

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            ResponseEntity<Map> response = restTemplate.postForEntity(
                    "https://api.openai.com/v1/chat/completions",
                    entity,
                    Map.class
            );

            boolean success = response.getStatusCode() == HttpStatus.OK;
            log.info("OpenAI connection test: {}", success ? "SUCCESS" : "FAILED");
            return success;

        } catch (Exception e) {
            log.error("OpenAI connection test failed: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Generate description with retry logic
     */
    public String generateDescriptionWithRetry(MultipartFile imageFile, int maxRetries) {
        for (int attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                String description = generateDescription(imageFile);
                if (description != null && !description.equals("Prize Item")) {
                    return description;
                }

                if (attempt < maxRetries) {
                    log.info("AI description attempt {} failed, retrying...", attempt);
                    Thread.sleep(1000); // Wait 1 second before retry
                }

            } catch (Exception e) {
                log.error("AI description attempt {} failed: {}", attempt, e.getMessage());
                if (attempt < maxRetries) {
                    try {
                        Thread.sleep(1000);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                }
            }
        }

        log.warn("All AI description attempts failed, using fallback");
        return generateFallbackDescription(imageFile.getOriginalFilename());
    }

    /**
     * Batch generate descriptions for multiple images
     */
    public Map<String, String> generateBatchDescriptions(List<MultipartFile> images) {
        Map<String, String> descriptions = new HashMap<>();

        for (MultipartFile image : images) {
            try {
                String filename = image.getOriginalFilename();
                String description = generateDescriptionWithRetry(image, 2);
                descriptions.put(filename, description);

                // Add small delay between requests to avoid rate limiting
                Thread.sleep(500);

            } catch (Exception e) {
                log.error("Failed to generate description for {}: {}", image.getOriginalFilename(), e.getMessage());
                descriptions.put(image.getOriginalFilename(), generateFallbackDescription(image.getOriginalFilename()));
            }
        }

        return descriptions;
    }
}