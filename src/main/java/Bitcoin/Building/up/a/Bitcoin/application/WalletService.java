package Bitcoin.Building.up.a.Bitcoin.application;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class WalletService {

    private final WalletRepository walletRepository;
    private final CoinTransactionRepository coinTransactionRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    /**
     * Create a new wallet for a user
     */
    public Wallet createWallet(User user) {
        Optional<Wallet> existingWallet = walletRepository.findByUserId(user.getId());
        if (existingWallet.isPresent()) {
            log.warn("Wallet already exists for user {}", user.getId());
            return existingWallet.get();
        }

        Wallet wallet = Wallet.builder()
                .user(user)
                .balance(BigDecimal.ZERO)
                .pendingBalance(BigDecimal.ZERO)
                .totalEarned(BigDecimal.ZERO)
                .totalSpent(BigDecimal.ZERO)
                .createdAt(LocalDateTime.now())
                .build();

        Wallet savedWallet = walletRepository.save(wallet);
        log.info("Created wallet for user {} with ID {}", user.getId(), savedWallet.getId());

        // Give welcome bonus
        awardCoins(user.getId(), BigDecimal.valueOf(100),
                CoinTransaction.TransactionCategory.ACHIEVEMENT_UNLOCK,
                "Welcome bonus!",
                "WELCOME-" + user.getId());

        return savedWallet;
    }

    /**
     * Get or create wallet for user
     */
    public Wallet getOrCreateWallet(Long userId) {
        return walletRepository.findByUserId(userId)
                .orElseGet(() -> {
                    User user = userRepository.findById(userId)
                            .orElseThrow(() -> new RuntimeException("User not found: " + userId));
                    return createWallet(user);
                });
    }

    /**
     * Get wallet by user ID
     */
    public Wallet getWallet(Long userId) {
        return walletRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Wallet not found for user: " + userId));
    }

    /**
     * ENHANCED: Award coins with reference tracking (for photo uploads)
     */
    public CoinTransaction awardCoins(Long userId, BigDecimal amount,
                                      CoinTransaction.TransactionCategory category,
                                      String description, String referenceId) {
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Amount must be positive");
        }

        Wallet wallet = getOrCreateWallet(userId);
        User user = wallet.getUser();

        // Create transaction record
        CoinTransaction transaction = CoinTransaction.builder()
                .toUser(user)
                .toWallet(wallet)
                .amount(amount)
                .type(CoinTransaction.TransactionType.EARN)
                .category(category)
                .description(description)
                .referenceId(referenceId)
                .status(CoinTransaction.TransactionStatus.COMPLETED)
                .build();

        CoinTransaction savedTransaction = coinTransactionRepository.save(transaction);

        // Update wallet balance
        wallet.addToBalance(amount);
        walletRepository.save(wallet);

        log.info("Awarded {} coins to user {} for {} (ref: {})", amount, userId, category, referenceId);

        // Send notification
        try {
            notificationService.sendNotification(
                    userId,
                    Notification.NotificationType.ACHIEVEMENT_UNLOCKED,
                    "Coins Earned!",
                    String.format("You earned %s coins! %s", amount, description)
            );
        } catch (Exception e) {
            log.warn("Failed to send notification for coin award: {}", e.getMessage());
        }

        return savedTransaction;
    }

    /**
     * ORIGINAL: Award coins (backward compatibility)
     */
    public CoinTransaction awardCoins(Long userId, BigDecimal amount,
                                      CoinTransaction.TransactionCategory category, String description) {
        return awardCoins(userId, amount, category, description, null);
    }

    /**
     * Spend coins (purchasing scenario)
     */
    public CoinTransaction spendCoins(Long userId, BigDecimal amount,
                                      CoinTransaction.TransactionCategory category,
                                      String description, String referenceId) {
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Amount must be positive");
        }

        Wallet wallet = getWallet(userId);

        if (wallet.getAvailableBalance().compareTo(amount) < 0) {
            throw new RuntimeException("Insufficient balance. Available: " +
                    wallet.getAvailableBalance() + ", Required: " + amount);
        }

        User user = wallet.getUser();

        // Create transaction record
        CoinTransaction transaction = CoinTransaction.builder()
                .fromUser(user)
                .fromWallet(wallet)
                .amount(amount)
                .type(CoinTransaction.TransactionType.SPEND)
                .category(category)
                .description(description)
                .referenceId(referenceId)
                .status(CoinTransaction.TransactionStatus.COMPLETED)
                .build();

        CoinTransaction savedTransaction = coinTransactionRepository.save(transaction);

        // Update wallet balance
        wallet.subtractFromBalance(amount);
        walletRepository.save(wallet);

        log.info("User {} spent {} coins for {} (ref: {})", userId, amount, category, referenceId);

        return savedTransaction;
    }

    /**
     * ENHANCED: Reverse transaction by reference ID (for photo deletions)
     */
    public void reverseTransactionByReference(String referenceId, String reason) {
        List<CoinTransaction> transactions = coinTransactionRepository
                .findByReferenceIdAndTypeAndStatus(referenceId,
                        CoinTransaction.TransactionType.EARN,
                        CoinTransaction.TransactionStatus.COMPLETED);

        for (CoinTransaction transaction : transactions) {
            try {
                // Create reversal transaction
                spendCoins(
                        transaction.getToUser().getId(),
                        transaction.getAmount(),
                        CoinTransaction.TransactionCategory.MANUAL_ADJUSTMENT,
                        "Reversal: " + reason,
                        "REVERSE-" + transaction.getId()
                );

                log.info("Reversed transaction {} for user {} - reason: {}",
                        transaction.getId(), transaction.getToUser().getId(), reason);

            } catch (RuntimeException e) {
                log.error("Failed to reverse transaction {}: {}", transaction.getId(), e.getMessage());
                throw e;
            }
        }
    }

    /**
     * Transfer coins between users
     */
    public CoinTransaction transferCoins(Long fromUserId, Long toUserId, BigDecimal amount, String description) {
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Amount must be positive");
        }

        if (fromUserId.equals(toUserId)) {
            throw new IllegalArgumentException("Cannot transfer to self");
        }

        Wallet fromWallet = getWallet(fromUserId);
        Wallet toWallet = getOrCreateWallet(toUserId);

        if (fromWallet.getAvailableBalance().compareTo(amount) < 0) {
            throw new RuntimeException("Insufficient balance for transfer");
        }

        // Create transaction record
        CoinTransaction transaction = CoinTransaction.builder()
                .fromUser(fromWallet.getUser())
                .toUser(toWallet.getUser())
                .fromWallet(fromWallet)
                .toWallet(toWallet)
                .amount(amount)
                .type(CoinTransaction.TransactionType.TRANSFER)
                .category(CoinTransaction.TransactionCategory.MANUAL_ADJUSTMENT)
                .description(description != null ? description : "User-to-user transfer")
                .status(CoinTransaction.TransactionStatus.COMPLETED)
                .build();

        CoinTransaction savedTransaction = coinTransactionRepository.save(transaction);

        // Update balances
        fromWallet.subtractFromBalance(amount);
        toWallet.addToBalance(amount);

        walletRepository.save(fromWallet);
        walletRepository.save(toWallet);

        log.info("Transferred {} coins from user {} to user {}", amount, fromUserId, toUserId);

        // Send notifications
        try {
            notificationService.sendNotification(
                    toUserId,
                    Notification.NotificationType.ACHIEVEMENT_UNLOCKED,
                    "Coins Received!",
                    String.format("You received %s coins from %s", amount, fromWallet.getUser().getName())
            );
        } catch (Exception e) {
            log.warn("Failed to send transfer notification: {}", e.getMessage());
        }

        return savedTransaction;
    }

    /**
     * Hold coins in escrow (for marketplace purchases)
     */
    public CoinTransaction holdInEscrow(Long userId, BigDecimal amount, String referenceId, String description) {
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Amount must be positive");
        }

        Wallet wallet = getWallet(userId);

        if (wallet.getAvailableBalance().compareTo(amount) < 0) {
            throw new RuntimeException("Insufficient balance for escrow");
        }

        User user = wallet.getUser();

        // Create escrow transaction
        CoinTransaction transaction = CoinTransaction.builder()
                .fromUser(user)
                .fromWallet(wallet)
                .amount(amount)
                .type(CoinTransaction.TransactionType.ESCROW_HOLD)
                .category(CoinTransaction.TransactionCategory.ESCROW_PAYMENT)
                .description(description)
                .referenceId(referenceId)
                .status(CoinTransaction.TransactionStatus.ESCROWED)
                .build();

        CoinTransaction savedTransaction = coinTransactionRepository.save(transaction);

        // Move from available to pending
        wallet.subtractFromBalance(amount);
        wallet.addToPending(amount);
        walletRepository.save(wallet);

        log.info("Held {} coins in escrow for user {} (ref: {})", amount, userId, referenceId);

        return savedTransaction;
    }

    /**
     * Release escrowed coins to seller
     */
    public CoinTransaction releaseEscrow(String referenceId, Long sellerUserId, String description) {
        // Find the escrow transaction - FIXED METHOD NAME
        CoinTransaction escrowTransaction = coinTransactionRepository
                .findEscrowTransactionByReferenceAndTypeAndStatus(referenceId,
                        CoinTransaction.TransactionType.ESCROW_HOLD,
                        CoinTransaction.TransactionStatus.ESCROWED)
                .orElseThrow(() -> new RuntimeException("Escrow transaction not found: " + referenceId));

        Wallet buyerWallet = escrowTransaction.getFromWallet();
        Wallet sellerWallet = getOrCreateWallet(sellerUserId);
        BigDecimal amount = escrowTransaction.getAmount();

        // Create release transaction
        CoinTransaction releaseTransaction = CoinTransaction.builder()
                .fromUser(buyerWallet.getUser())
                .toUser(sellerWallet.getUser())
                .fromWallet(buyerWallet)
                .toWallet(sellerWallet)
                .amount(amount)
                .type(CoinTransaction.TransactionType.ESCROW_RELEASE)
                .category(CoinTransaction.TransactionCategory.ESCROW_PAYMENT)
                .description(description)
                .referenceId(referenceId)
                .status(CoinTransaction.TransactionStatus.COMPLETED)
                .build();

        CoinTransaction savedReleaseTransaction = coinTransactionRepository.save(releaseTransaction);

        // Update escrow transaction status
        escrowTransaction.setStatus(CoinTransaction.TransactionStatus.COMPLETED);
        coinTransactionRepository.save(escrowTransaction);

        // Update wallets
        buyerWallet.releasePending(amount.negate()); // Remove from pending
        sellerWallet.addToBalance(amount); // Add to seller balance

        walletRepository.save(buyerWallet);
        walletRepository.save(sellerWallet);

        log.info("Released {} coins from escrow to seller {} (ref: {})", amount, sellerUserId, referenceId);

        // Notify seller
        try {
            notificationService.sendNotification(
                    sellerUserId,
                    Notification.NotificationType.LOTTERY_WINNER,
                    "Payment Received!",
                    String.format("You received %s coins for your sale!", amount)
            );
        } catch (Exception e) {
            log.warn("Failed to send escrow release notification: {}", e.getMessage());
        }

        return savedReleaseTransaction;
    }

    /**
     * Refund escrowed coins to buyer
     */
    public CoinTransaction refundEscrow(String referenceId, String reason) {
        // Find the escrow transaction - FIXED METHOD NAME
        CoinTransaction escrowTransaction = coinTransactionRepository
                .findEscrowTransactionByReferenceAndTypeAndStatus(referenceId,
                        CoinTransaction.TransactionType.ESCROW_HOLD,
                        CoinTransaction.TransactionStatus.ESCROWED)
                .orElseThrow(() -> new RuntimeException("Escrow transaction not found: " + referenceId));

        Wallet buyerWallet = escrowTransaction.getFromWallet();
        BigDecimal amount = escrowTransaction.getAmount();

        // Create refund transaction
        CoinTransaction refundTransaction = CoinTransaction.builder()
                .toUser(buyerWallet.getUser())
                .toWallet(buyerWallet)
                .amount(amount)
                .type(CoinTransaction.TransactionType.REFUND)
                .category(CoinTransaction.TransactionCategory.DISPUTE_RESOLUTION)
                .description("Refund: " + reason)
                .referenceId(referenceId)
                .status(CoinTransaction.TransactionStatus.COMPLETED)
                .build();

        CoinTransaction savedRefundTransaction = coinTransactionRepository.save(refundTransaction);

        // Update escrow transaction status
        escrowTransaction.setStatus(CoinTransaction.TransactionStatus.CANCELLED);
        coinTransactionRepository.save(escrowTransaction);

        // Release from pending back to available
        buyerWallet.releasePending(amount);
        walletRepository.save(buyerWallet);

        log.info("Refunded {} coins from escrow to buyer {} (ref: {})",
                amount, buyerWallet.getUser().getId(), referenceId);

        // Notify buyer
        try {
            notificationService.sendNotification(
                    buyerWallet.getUser().getId(),
                    Notification.NotificationType.SYSTEM_MAINTENANCE,
                    "Refund Processed",
                    String.format("Your %s coins have been refunded. Reason: %s", amount, reason)
            );
        } catch (Exception e) {
            log.warn("Failed to send refund notification: {}", e.getMessage());
        }

        return savedRefundTransaction;
    }

    /**
     * Get transaction history for user
     */
    public List<CoinTransaction> getTransactionHistory(Long userId) {
        return coinTransactionRepository.findUserTransactions(userId);
    }

    /**
     * Get transaction history with pagination
     */
    public List<CoinTransaction> getTransactionHistory(Long userId, int page, int size) {
        return coinTransactionRepository.findUserTransactionsWithPagination(userId, page * size, size);
    }

    /**
     * Top up wallet with real money (placeholder for payment integration)
     */
    public CoinTransaction topUpWallet(Long userId, BigDecimal amount, String paymentMethod, String transactionId) {
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Amount must be positive");
        }

        Wallet wallet = getOrCreateWallet(userId);
        User user = wallet.getUser();

        // In real implementation, verify payment with Stripe/PayPal here

        CoinTransaction transaction = CoinTransaction.builder()
                .toUser(user)
                .toWallet(wallet)
                .amount(amount)
                .type(CoinTransaction.TransactionType.TOP_UP)
                .category(CoinTransaction.TransactionCategory.MANUAL_ADJUSTMENT)
                .description("Top-up via " + paymentMethod)
                .referenceId(transactionId)
                .status(CoinTransaction.TransactionStatus.COMPLETED)
                .build();

        CoinTransaction savedTransaction = coinTransactionRepository.save(transaction);

        // Update wallet
        wallet.addToBalance(amount);
        walletRepository.save(wallet);

        log.info("Topped up {} coins for user {} via {}", amount, userId, paymentMethod);

        // Notify user
        try {
            notificationService.sendNotification(
                    userId,
                    Notification.NotificationType.ACHIEVEMENT_UNLOCKED,
                    "Top-up Successful!",
                    String.format("Your wallet has been credited with %s coins", amount)
            );
        } catch (Exception e) {
            log.warn("Failed to send top-up notification: {}", e.getMessage());
        }

        return savedTransaction;
    }
}