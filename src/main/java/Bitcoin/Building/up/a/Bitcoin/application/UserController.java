package Bitcoin.Building.up.a.Bitcoin.application;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
public class UserController {

    private final UserRepository userRepository;

    @PostMapping("/create")
    public ResponseEntity<?> createUser(
            @RequestParam("name") String name,
            @RequestParam("email") String email,
            @RequestParam(value = "country", defaultValue = "Thailand") String country,
            @RequestParam(value = "phone", required = false) String phone) {

        try {
            log.info("Creating user: name={}, email={}, country={}", name, email, country);

            // Check if user already exists by email
            if (userRepository.findByEmail(email.toLowerCase().trim()).isPresent()) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("message", "User with this email already exists");
                return ResponseEntity.badRequest().body(errorResponse);
            }

            User user = User.builder()
                    .fullName(name.trim())  // FIXED: Use fullName instead of name
                    .email(email.trim().toLowerCase())
                    .country(country.trim())
                    .phone(phone != null ? phone.trim() : null)
                    .emailVerified(false)  // Set default email verification status
                    .build();

            User savedUser = userRepository.save(user);
            log.info("User created successfully with ID: {}", savedUser.getId());

            Map<String, Object> userMap = new HashMap<>();
            userMap.put("id", savedUser.getId());
            userMap.put("name", savedUser.getName());
            userMap.put("email", savedUser.getEmail());
            userMap.put("country", savedUser.getCountry());
            userMap.put("phone", savedUser.getPhone());
            userMap.put("emailVerified", savedUser.isEmailVerified()); // FIXED: Use isEmailVerified()

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "User created successfully");
            response.put("user", userMap);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Failed to create user", e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Failed to create user: " + e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    @GetMapping("/all")
    public ResponseEntity<?> getAllUsers() {
        try {
            List<User> users = userRepository.findAll();

            List<Map<String, Object>> userList = users.stream()
                    .map(user -> {
                        Map<String, Object> userMap = new HashMap<>();
                        userMap.put("id", user.getId());
                        userMap.put("name", user.getName());
                        userMap.put("email", user.getEmail());
                        userMap.put("country", user.getCountry());
                        userMap.put("phone", user.getPhone());
                        userMap.put("emailVerified", user.isEmailVerified()); // FIXED
                        userMap.put("photosCount", user.getPhotos() != null ? user.getPhotos().size() : 0);
                        return userMap;
                    })
                    .collect(java.util.stream.Collectors.toList());

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("users", userList);
            response.put("totalUsers", users.size());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Failed to get users", e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Failed to get users: " + e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    @GetMapping("/{userId}")
    public ResponseEntity<?> getUser(@PathVariable Long userId) {
        try {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found with ID: " + userId));

            Map<String, Object> userMap = new HashMap<>();
            userMap.put("id", user.getId());
            userMap.put("name", user.getName());
            userMap.put("email", user.getEmail());
            userMap.put("country", user.getCountry());
            userMap.put("phone", user.getPhone());
            userMap.put("emailVerified", user.isEmailVerified()); // FIXED
            userMap.put("createdAt", user.getCreatedAt() != null ? user.getCreatedAt().toString() : null);
            userMap.put("photosCount", user.getPhotos() != null ? user.getPhotos().size() : 0);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("user", userMap);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Failed to get user", e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "User not found: " + e.getMessage());
            return ResponseEntity.status(404).body(errorResponse);
        }
    }

    @PostMapping("/create-test-user")
    public ResponseEntity<?> createTestUser() {
        try {
            // Check if test user already exists
            if (userRepository.findByEmail("modernadventure805@gmail.com").isPresent()) {
                User existingUser = userRepository.findByEmail("modernadventure805@gmail.com").get();
                Map<String, Object> userMap = new HashMap<>();
                userMap.put("id", existingUser.getId());
                userMap.put("name", existingUser.getName());
                userMap.put("email", existingUser.getEmail());
                userMap.put("emailVerified", existingUser.isEmailVerified()); // FIXED

                Map<String, Object> response = new HashMap<>();
                response.put("success", true);
                response.put("message", "Test user already exists");
                response.put("user", userMap);

                return ResponseEntity.ok(response);
            }

            User testUser = User.builder()
                    .fullName("Test User")  // FIXED: Use fullName instead of name
                    .email("modernadventure805@gmail.com")
                    .country("Thailand")
                    .phone("+66-xxx-xxx-xxx")
                    .emailVerified(true)  // Set as verified for test user
                    .build();

            User savedUser = userRepository.save(testUser);
            log.info("Test user created with ID: {}", savedUser.getId());

            Map<String, Object> userMap = new HashMap<>();
            userMap.put("id", savedUser.getId());
            userMap.put("name", savedUser.getName());
            userMap.put("email", savedUser.getEmail());
            userMap.put("country", savedUser.getCountry());
            userMap.put("phone", savedUser.getPhone());
            userMap.put("emailVerified", savedUser.isEmailVerified()); // FIXED

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Test user created successfully");
            response.put("user", userMap);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Failed to create test user", e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Failed to create test user: " + e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    @GetMapping("/by-email")
    @Operation(summary = "Get user by email", description = "Retrieve user details by email address")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<?> getUserByEmail(@RequestParam String email) {
        try {
            log.info("Looking up user by email: {}", maskEmail(email));

            User user = userRepository.findByEmail(email.toLowerCase().trim())
                    .orElse(null);

            if (user == null) {
                log.warn("User not found with email: {}", maskEmail(email));
                return ResponseEntity.status(404).body(Map.of(
                        "success", false,
                        "message", "User not found"
                ));
            }

            Map<String, Object> userMap = new HashMap<>();
            userMap.put("id", user.getId());
            userMap.put("name", user.getName());
            userMap.put("email", user.getEmail());
            userMap.put("country", user.getCountry());
            userMap.put("phone", user.getPhone());
            userMap.put("emailVerified", user.isEmailVerified()); // FIXED
            userMap.put("createdAt", user.getCreatedAt() != null ?
                    user.getCreatedAt().toString() : null);

            log.info("User found with ID: {}", user.getId());

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "user", userMap
            ));

        } catch (Exception e) {
            log.error("Failed to get user by email", e);
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "message", "Failed to retrieve user"
            ));
        }
    }

    // Utility method for masking email
    private String maskEmail(String email) {
        if (email == null || email.length() < 3) return "***";
        int atIndex = email.indexOf('@');
        if (atIndex <= 0) return "***";
        return email.substring(0, Math.min(2, atIndex)) + "***" + email.substring(atIndex);
    }
}