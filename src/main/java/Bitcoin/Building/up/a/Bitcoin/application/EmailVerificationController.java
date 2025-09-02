package Bitcoin.Building.up.a.Bitcoin.application;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class EmailVerificationController {

    private final UserRepository userRepository;
    private final EmailService emailService;

    @PersistenceContext
    private EntityManager entityManager;

    /**
     * Handle email verification when user clicks link in email
     * This endpoint is called directly from email links
     */
    @GetMapping("/verify-email")
    @Transactional  // CRITICAL: This ensures the database changes are committed
    public ResponseEntity<String> verifyEmail(@RequestParam("token") String token) {
        try {
            log.info("Processing email verification for token: {}", token);

            if (token == null || token.trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(buildHtmlResponse("Verification Failed",
                                "Invalid verification token.",
                                "The verification link appears to be malformed. Please try again or contact support.",
                                false));
            }

            // Find user by verification token
            Optional<User> userOptional = userRepository.findByVerificationToken(token);

            if (userOptional.isEmpty()) {
                log.warn("Invalid or expired verification token: {}", token);
                return ResponseEntity.badRequest()
                        .body(buildHtmlResponse("Verification Failed",
                                "Invalid or Expired Token",
                                "This verification link is invalid or has expired. Please request a new verification email.",
                                false));
            }

            User user = userOptional.get();

            // Check if already verified
            if (user.isEmailVerified()) {
                log.info("Email already verified for user: {}", user.getEmail());
                return ResponseEntity.ok()
                        .body(buildHtmlResponse("Already Verified",
                                "Email Already Verified",
                                "Your email address has already been verified. You can now sign in to your account.",
                                true));
            }

            // Debug logging before verification
            log.info("Before verification - User ID: {}, Email: {}, Verified: {}",
                    user.getId(), user.getEmail(), user.isEmailVerified());

            // Use direct update query - this bypasses Hibernate's session cache
            int updatedRows = userRepository.verifyUserEmail(user.getId());
            log.info("Database update result: {} rows updated", updatedRows);

            // If JPQL doesn't work, try native SQL
            if (updatedRows == 0) {
                log.warn("JPQL update failed, trying native SQL");
                updatedRows = userRepository.verifyUserEmailNative(user.getId());
                log.info("Native SQL update result: {} rows updated", updatedRows);
            }

            // Verify the update worked by fetching fresh from database
            userRepository.flush(); // Force any pending changes
            entityManager.clear(); // Clear the persistence context

            User verifiedUser = userRepository.findById(user.getId()).orElse(null);
            log.info("After verification - User ID: {}, Email: {}, Verified: {}",
                    verifiedUser != null ? verifiedUser.getId() : "null",
                    verifiedUser != null ? verifiedUser.getEmail() : "null",
                    verifiedUser != null ? verifiedUser.isEmailVerified() : "null");

            log.info("Email successfully verified for user: {}", user.getEmail());

            return ResponseEntity.ok()
                    .body(buildHtmlResponse("Verification Successful",
                            "Email Verified Successfully!",
                            "Your email address has been verified. You can now sign in to your Photo Lottery account and start uploading photos!",
                            true));

        } catch (Exception e) {
            log.error("Error during email verification: {}", e.getMessage(), e);
            return ResponseEntity.status(500)
                    .body(buildHtmlResponse("Verification Error",
                            "An Error Occurred",
                            "There was an error processing your verification. Please try again or contact support.",
                            false));
        }
    }

    /**
     * API endpoint for resending verification email
     */
    @PostMapping("/resend-verification")
    @Transactional  // Add this to ensure database changes are committed
    public ResponseEntity<?> resendVerificationEmail(@RequestBody Map<String, String> request) {
        try {
            String email = request.get("email");
            log.info("Resending verification email for: {}", email);

            if (email == null || email.trim().isEmpty()) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "Email address is required");
                return ResponseEntity.badRequest().body(response);
            }

            Optional<User> userOptional = userRepository.findByEmail(email.toLowerCase().trim());

            if (userOptional.isEmpty()) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "User not found with this email address");
                return ResponseEntity.badRequest().body(response);
            }

            User user = userOptional.get();

            if (user.isEmailVerified()) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", true);
                response.put("message", "Email is already verified");
                return ResponseEntity.ok(response);
            }

            // Generate new verification token
            String newToken = java.util.UUID.randomUUID().toString();
            user.setVerificationToken(newToken);
            user.setVerificationTokenExpiry(LocalDateTime.now().plusHours(24));
            userRepository.save(user);

            // Send verification email
            emailService.sendVerificationEmail(user.getEmail(), user.getName(), newToken);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Verification email sent successfully");

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Error resending verification email: {}", e.getMessage(), e);
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Failed to resend verification email");
            return ResponseEntity.status(500).body(response);
        }
    }

    /**
     * Build HTML response for email verification page
     */
    private String buildHtmlResponse(String title, String heading, String message, boolean success) {
        String color = success ? "#28a745" : "#dc3545";
        String icon = success ? "✅" : "❌";

        return String.format("""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>%s - Photo Lottery</title>
                <style>
                    body { 
                        font-family: Arial, sans-serif; 
                        background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%);
                        margin: 0; 
                        padding: 20px; 
                        min-height: 100vh;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    .container { 
                        background: white; 
                        border-radius: 15px; 
                        padding: 40px; 
                        text-align: center; 
                        max-width: 500px;
                        box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                    }
                    .icon { 
                        font-size: 4rem; 
                        margin-bottom: 20px; 
                    }
                    h1 { 
                        color: %s; 
                        margin-bottom: 15px; 
                        font-size: 2rem;
                    }
                    p { 
                        color: #666; 
                        line-height: 1.6; 
                        margin-bottom: 30px;
                        font-size: 1.1rem;
                    }
                    .button { 
                        display: inline-block; 
                        background: linear-gradient(135deg, #667eea, #764ba2); 
                        color: white; 
                        padding: 15px 30px; 
                        text-decoration: none; 
                        border-radius: 25px; 
                        font-weight: bold;
                        font-size: 1rem;
                        transition: transform 0.3s ease;
                    }
                    .button:hover {
                        transform: translateY(-2px);
                    }
                    .footer {
                        margin-top: 30px;
                        color: #999;
                        font-size: 0.9rem;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="icon">%s</div>
                    <h1>%s</h1>
                    <p>%s</p>
                    <a href="http://localhost:3000/signin" class="button">Go to Sign In</a>
                    <div class="footer">
                        Photo Lottery - Capture, Compete, Win!
                    </div>
                </div>
            </body>
            </html>
            """, title, color, icon, heading, message);
    }
}