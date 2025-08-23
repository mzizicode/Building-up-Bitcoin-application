package Bitcoin.Building.up.a.Bitcoin.application;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/wallet")
@Tag(name = "Wallet", description = "Coin wallet management endpoints")
public class WalletController {

    private final WalletService walletService;
    private final UserRepository userRepository;

    /**
     * Get current user's wallet balance and details
     */
    @GetMapping("/balance")
    @Operation(summary = "Get wallet balance", description = "Retrieve current user's wallet balance and details")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<?> getWalletBalance() {
        try {
            User currentUser = getCurrentUser();
            Wallet wallet = walletService.getOrCreateWallet(currentUser.getId());

            Map<String, Object> walletData = new HashMap<>();
            walletData.put("id", wallet.getId());
            walletData.put("balance", wallet.getBalance());
            walletData.put("availableBalance", wallet.getAvailableBalance());
            walletData.put("pendingBalance", wallet.getPendingBalance());
            walletData.put("totalEarned", wallet.getTotalEarned());
            walletData.put("totalSpent", wallet.getTotalSpent());
            walletData.put("createdAt", wallet.getCreatedAt());
            walletData.put("updatedAt", wallet.getUpdatedAt());

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "wallet", walletData
            ));

        } catch (Exception e) {
            log.error("Failed to get wallet balance", e);
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "message", "Failed to retrieve wallet balance"
            ));
        }
    }

    /**
     * Get transaction history
     */
    @GetMapping("/transactions")
    @Operation(summary = "Get transaction history", description = "Retrieve user's transaction history")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<?> getTransactionHistory(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        try {
            User currentUser = getCurrentUser();
            List<CoinTransaction> transactions = walletService.getTransactionHistory(currentUser.getId(), page, size);

            List<Map<String, Object>> transactionData = transactions.stream()
                    .map(this::createTransactionResponse)
                    .collect(Collectors.toList());

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "transactions", transactionData,
                    "page", page,
                    "size", size
            ));

        } catch (Exception e) {
            log.error("Failed to get transaction history", e);
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "message", "Failed to retrieve transaction history"
            ));
        }
    }

    /**
     * Top up wallet with real money
     */
    @PostMapping("/top-up")
    @Operation(summary = "Top up wallet", description = "Add coins to wallet using real money")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<?> topUpWallet(@Valid @RequestBody TopUpRequest request) {
        try {
            User currentUser = getCurrentUser();

            if (request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "Amount must be positive"
                ));
            }

            if (request.getAmount().compareTo(BigDecimal.valueOf(10000)) > 0) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "Maximum top-up amount is 10,000 coins"
                ));
            }

            // In real implementation, process payment with Stripe/PayPal here
            // For now, we'll simulate successful payment

            CoinTransaction transaction = walletService.topUpWallet(
                    currentUser.getId(),
                    request.getAmount(),
                    request.getPaymentMethod(),
                    request.getTransactionId()
            );

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Top-up successful",
                    "transaction", createTransactionResponse(transaction)
            ));

        } catch (Exception e) {
            log.error("Top-up failed", e);
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "message", "Top-up failed: " + e.getMessage()
            ));
        }
    }

    /**
     * Transfer coins to another user
     */
    @PostMapping("/transfer")
    @Operation(summary = "Transfer coins", description = "Transfer coins to another user")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<?> transferCoins(@Valid @RequestBody TransferRequest request) {
        try {
            User currentUser = getCurrentUser();

            if (request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "Amount must be positive"
                ));
            }

            // Find recipient by email
            User recipient = userRepository.findByEmail(request.getToUserEmail().toLowerCase().trim())
                    .orElseThrow(() -> new RuntimeException("Recipient not found: " + request.getToUserEmail()));

            if (recipient.getId().equals(currentUser.getId())) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "Cannot transfer to yourself"
                ));
            }

            CoinTransaction transaction = walletService.transferCoins(
                    currentUser.getId(),
                    recipient.getId(),
                    request.getAmount(),
                    request.getDescription()
            );

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", String.format("Transferred %s coins to %s", request.getAmount(), recipient.getName()),
                    "transaction", createTransactionResponse(transaction)
            ));

        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", e.getMessage()
            ));
        } catch (Exception e) {
            log.error("Transfer failed", e);
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "message", "Transfer failed"
            ));
        }
    }

    /**
     * Award coins (for system/admin use)
     */
    @PostMapping("/award")
    @Operation(summary = "Award coins", description = "Award coins to a user (system/admin only)")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<?> awardCoins(@Valid @RequestBody AwardCoinsRequest request) {
        try {
            User currentUser = getCurrentUser();

            // In production, add admin role check here
            // if (!currentUser.hasRole("ADMIN")) { ... }

            User recipient = currentUser; // For now, award to self for testing
            if (request.getUserId() != null) {
                recipient = userRepository.findById(request.getUserId())
                        .orElseThrow(() -> new RuntimeException("User not found: " + request.getUserId()));
            }

            CoinTransaction transaction = walletService.awardCoins(
                    recipient.getId(),
                    request.getAmount(),
                    request.getCategory(),
                    request.getDescription()
            );

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", String.format("Awarded %s coins to %s", request.getAmount(), recipient.getName()),
                    "transaction", createTransactionResponse(transaction)
            ));

        } catch (Exception e) {
            log.error("Award coins failed", e);
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "message", "Failed to award coins: " + e.getMessage()
            ));
        }
    }

    /**
     * Get earning opportunities
     */
    @GetMapping("/earning-opportunities")
    @Operation(summary = "Get earning opportunities", description = "Get available ways to earn coins")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<?> getEarningOpportunities() {
        try {
            List<Map<String, Object>> opportunities = List.of(
                    Map.of(
                            "type", "PHOTO_UPLOAD",
                            "title", "Upload Photos",
                            "description", "Upload photos to the lottery",
                            "reward", 25,
                            "icon", "📸",
                            "action", "/dashboard"
                    ),
                    Map.of(
                            "type", "DAILY_LOGIN",
                            "title", "Daily Login",
                            "description", "Check in daily to earn coins",
                            "reward", 10,
                            "icon", "🎯",
                            "action", "/wallet"
                    ),
                    Map.of(
                            "type", "REFERRAL",
                            "title", "Refer Friends",
                            "description", "Invite friends to join",
                            "reward", 50,
                            "icon", "🤝",
                            "action", "/referrals"
                    ),
                    Map.of(
                            "type", "FIRST_SALE",
                            "title", "Make Your First Sale",
                            "description", "Sell an item in the marketplace",
                            "reward", 100,
                            "icon", "🏪",
                            "action", "/marketplace/sell"
                    ),
                    Map.of(
                            "type", "REVIEW",
                            "title", "Leave Reviews",
                            "description", "Review purchases and sellers",
                            "reward", 5,
                            "icon", "⭐",
                            "action", "/orders"
                    )
            );

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "opportunities", opportunities
            ));

        } catch (Exception e) {
            log.error("Failed to get earning opportunities", e);
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "message", "Failed to get earning opportunities"
            ));
        }
    }

    // Utility methods
    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new RuntimeException("User not authenticated");
        }

        String email = authentication.getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found: " + email));
    }

    private Map<String, Object> createTransactionResponse(CoinTransaction transaction) {
        Map<String, Object> response = new HashMap<>();
        response.put("id", transaction.getId());
        response.put("type", transaction.getType().toString());
        response.put("category", transaction.getCategory() != null ? transaction.getCategory().toString() : null);
        response.put("amount", transaction.getAmount());
        response.put("description", transaction.getDescription());
        response.put("referenceId", transaction.getReferenceId());
        response.put("status", transaction.getStatus().toString());
        response.put("createdAt", transaction.getCreatedAt());

        if (transaction.getFromUser() != null) {
            response.put("fromUser", transaction.getFromUser().getName());
        }
        if (transaction.getToUser() != null) {
            response.put("toUser", transaction.getToUser().getName());
        }

        return response;
    }

    // Request DTOs
    @Data
    public static class TopUpRequest {
        @jakarta.validation.constraints.NotNull
        @jakarta.validation.constraints.DecimalMin("1.0")
        private BigDecimal amount;

        @jakarta.validation.constraints.NotBlank
        private String paymentMethod;

        private String transactionId;
    }

    @Data
    public static class TransferRequest {
        @jakarta.validation.constraints.NotNull
        @jakarta.validation.constraints.DecimalMin("1.0")
        private BigDecimal amount;

        @jakarta.validation.constraints.NotBlank
        @jakarta.validation.constraints.Email
        private String toUserEmail;

        private String description;
    }

    @Data
    public static class AwardCoinsRequest {
        private Long userId; // If null, award to current user

        @jakarta.validation.constraints.NotNull
        @jakarta.validation.constraints.DecimalMin("1.0")
        private BigDecimal amount;

        @jakarta.validation.constraints.NotNull
        private CoinTransaction.TransactionCategory category;

        @jakarta.validation.constraints.NotBlank
        private String description;
    }
}