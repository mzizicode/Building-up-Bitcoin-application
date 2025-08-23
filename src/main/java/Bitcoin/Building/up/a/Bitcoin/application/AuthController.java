package Bitcoin.Building.up.a.Bitcoin.application;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/auth")
@Tag(name = "Authentication", description = "User authentication and registration endpoints")
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final UserDetailsService userDetailsService;
    private final NotificationService notificationService;

    @PostMapping("/register")
    @Operation(summary = "Register new user", description = "Register a new user account with email verification")
    @ApiResponse(responseCode = "200", description = "User registered successfully")
    @ApiResponse(responseCode = "400", description = "Invalid input or email already exists")
    public ResponseEntity<?> registerUser(@Valid @RequestBody RegisterRequest request) {
        try {
            log.info("Registration attempt for email: {}", maskEmail(request.getEmail()));

            // Validate password strength
            if (!isPasswordStrong(request.getPassword())) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "Password must be at least 8 characters with uppercase, lowercase, and number/symbol"
                ));
            }

            // Check if email already exists
            if (userRepository.findByEmail(request.getEmail().toLowerCase().trim()).isPresent()) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "An account with this email already exists"
                ));
            }

            // Create verification token
            String verificationToken = UUID.randomUUID().toString();
            LocalDateTime tokenExpiry = LocalDateTime.now().plusHours(24); // 24 hour expiry

            // Create user
            User user = User.builder()
                    .name(sanitizeInput(request.getName()))
                    .email(request.getEmail().toLowerCase().trim())
                    .passwordHash(passwordEncoder.encode(request.getPassword()))
                    .country(sanitizeInput(request.getCountry()))
                    .phone(sanitizeInput(request.getPhone()))
                    .emailVerified(false)
                    .verificationToken(verificationToken)
                    .verificationTokenExpiry(tokenExpiry)
                    .build();

            User savedUser = userRepository.save(user);

            // Send verification email
            try {
                emailService.sendVerificationEmail(savedUser.getEmail(), savedUser.getName(), verificationToken);
            } catch (Exception e) {
                log.error("Failed to send verification email", e);
                // Continue with registration even if email fails
            }

            // 🚀 NEW: Send welcome notification after successful registration
            notificationService.sendWelcomeNotification(savedUser);

            log.info("User registered successfully with ID: {}", savedUser.getId());

            Map<String, Object> userResponse = createUserResponse(savedUser);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Registration successful. Please check your email to verify your account.",
                    "user", userResponse
            ));

        } catch (Exception e) {
            log.error("Registration failed", e);
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "message", "Registration failed. Please try again."
            ));
        }
    }

    @PostMapping("/signin")
    @Operation(summary = "Sign in user", description = "Authenticate user and return JWT token")
    @ApiResponse(responseCode = "200", description = "User signed in successfully")
    @ApiResponse(responseCode = "400", description = "Invalid credentials or email not verified")
    public ResponseEntity<?> signInUser(@Valid @RequestBody SignInRequest request) {
        try {
            log.info("Sign in attempt for email: {}", maskEmail(request.getEmail()));

            // Find user by email
            User user = userRepository.findByEmail(request.getEmail().toLowerCase().trim())
                    .orElse(null);

            if (user == null) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "Invalid email or password"
                ));
            }

            // Check email verification
            if (!user.getEmailVerified()) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "Please verify your email before signing in"
                ));
            }

            // Authenticate user
            try {
                authenticationManager.authenticate(
                        new UsernamePasswordAuthenticationToken(
                                request.getEmail().toLowerCase().trim(),
                                request.getPassword()
                        )
                );
            } catch (Exception e) {
                log.warn("Authentication failed for user: {}", maskEmail(request.getEmail()));
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "Invalid email or password"
                ));
            }

            // Generate JWT token
            UserDetails userDetails = userDetailsService.loadUserByUsername(user.getEmail());
            String jwtToken = jwtService.generateToken(userDetails);

            log.info("User signed in successfully with ID: {}", user.getId());

            Map<String, Object> userResponse = createUserResponse(user);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Sign in successful",
                    "user", userResponse,
                    "token", jwtToken
            ));

        } catch (Exception e) {
            log.error("Sign in failed", e);
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "message", "Sign in failed. Please try again."
            ));
        }
    }

    @GetMapping("/verify-email")
    @Operation(summary = "Verify email", description = "Verify user email using verification token")
    @ApiResponse(responseCode = "200", description = "Email verified successfully")
    @ApiResponse(responseCode = "400", description = "Invalid or expired token")
    public ResponseEntity<?> verifyEmail(@RequestParam String token) {
        try {
            log.info("Email verification attempt with token");

            User user = userRepository.findByVerificationToken(token).orElse(null);

            if (user == null) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "Invalid verification token"
                ));
            }

            // Check token expiry
            if (user.getVerificationTokenExpiry().isBefore(LocalDateTime.now())) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "Verification token has expired. Please request a new one."
                ));
            }

            // Verify email
            user.setEmailVerified(true);
            user.setVerificationToken(null);
            user.setVerificationTokenExpiry(null);
            userRepository.save(user);

            log.info("Email verified successfully for user ID: {}", user.getId());

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Email verified successfully! You can now sign in."
            ));

        } catch (Exception e) {
            log.error("Email verification failed", e);
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "message", "Email verification failed. Please try again."
            ));
        }
    }

    @PostMapping("/resend-verification")
    @Operation(summary = "Resend verification email", description = "Resend email verification for unverified users")
    public ResponseEntity<?> resendVerificationEmail(@RequestParam String email) {
        try {
            User user = userRepository.findByEmail(email.toLowerCase().trim()).orElse(null);

            if (user == null) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "User not found"
                ));
            }

            if (user.getEmailVerified()) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "Email is already verified"
                ));
            }

            // Generate new verification token
            String verificationToken = UUID.randomUUID().toString();
            LocalDateTime tokenExpiry = LocalDateTime.now().plusHours(24);

            user.setVerificationToken(verificationToken);
            user.setVerificationTokenExpiry(tokenExpiry);
            userRepository.save(user);

            // Send verification email
            emailService.sendVerificationEmail(user.getEmail(), user.getName(), verificationToken);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Verification email sent successfully"
            ));

        } catch (Exception e) {
            log.error("Resend verification failed", e);
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "message", "Failed to resend verification email"
            ));
        }
    }

    // Utility methods
    private boolean isPasswordStrong(String password) {
        if (password == null || password.length() < 8) {
            return false;
        }

        boolean hasUppercase = password.matches(".*[A-Z].*");
        boolean hasLowercase = password.matches(".*[a-z].*");
        boolean hasNumberOrSymbol = password.matches(".*[0-9\\-_!@#$%^&*()+={}\\[\\]:\"';,.<>?/].*");

        return hasUppercase && hasLowercase && hasNumberOrSymbol;
    }

    private String sanitizeInput(String input) {
        if (input == null) return null;
        return input.trim().replaceAll("[<>\"'&]", "");
    }

    private String maskEmail(String email) {
        if (email == null || email.length() < 3) return "***";
        int atIndex = email.indexOf('@');
        if (atIndex <= 0) return "***";
        return email.substring(0, Math.min(2, atIndex)) + "***" + email.substring(atIndex);
    }

    private Map<String, Object> createUserResponse(User user) {
        Map<String, Object> userResponse = new HashMap<>();
        userResponse.put("id", user.getId());
        userResponse.put("name", user.getName());
        userResponse.put("email", user.getEmail());
        userResponse.put("country", user.getCountry());
        userResponse.put("phone", user.getPhone());
        userResponse.put("emailVerified", user.getEmailVerified());
        userResponse.put("createdAt", user.getCreatedAt().toString());
        return userResponse;
    }
}