package Bitcoin.Building.up.a.Bitcoin.application;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CoinTransactionRepository extends JpaRepository<CoinTransaction, Long> {

    // Find transactions by user (from or to)
    @Query("SELECT t FROM CoinTransaction t WHERE t.fromUser.id = :userId OR t.toUser.id = :userId ORDER BY t.createdAt DESC")
    List<CoinTransaction> findUserTransactions(@Param("userId") Long userId);

    // Find transactions by user with pagination
    @Query(value = "SELECT * FROM coin_transactions WHERE from_user_id = :userId OR to_user_id = :userId ORDER BY created_at DESC LIMIT :limit OFFSET :offset", nativeQuery = true)
    List<CoinTransaction> findUserTransactionsWithPagination(@Param("userId") Long userId, @Param("offset") int offset, @Param("limit") int limit);

    // ENHANCED: Find by reference ID and type
    List<CoinTransaction> findByReferenceIdAndType(String referenceId, CoinTransaction.TransactionType type);

    // ENHANCED: Find by reference ID, type, and status (returns List)
    List<CoinTransaction> findByReferenceIdAndTypeAndStatus(String referenceId,
                                                            CoinTransaction.TransactionType type,
                                                            CoinTransaction.TransactionStatus status);

    // ENHANCED: Find specific escrow transaction (returns Optional) - RENAMED to avoid conflict
    @Query("SELECT t FROM CoinTransaction t WHERE t.referenceId = :referenceId AND t.type = :type AND t.status = :status ORDER BY t.createdAt DESC LIMIT 1")
    Optional<CoinTransaction> findEscrowTransactionByReferenceAndTypeAndStatus(@Param("referenceId") String referenceId,
                                                                               @Param("type") CoinTransaction.TransactionType type,
                                                                               @Param("status") CoinTransaction.TransactionStatus status);

    // Find by transaction type
    List<CoinTransaction> findByType(CoinTransaction.TransactionType type);

    // Find by category
    List<CoinTransaction> findByCategory(CoinTransaction.TransactionCategory category);

    // Find by status
    List<CoinTransaction> findByStatus(CoinTransaction.TransactionStatus status);

    // Find transactions from user
    List<CoinTransaction> findByFromUserIdOrderByCreatedAtDesc(Long fromUserId);

    // Find transactions to user
    List<CoinTransaction> findByToUserIdOrderByCreatedAtDesc(Long toUserId);

    // Find transactions by wallet
    List<CoinTransaction> findByFromWalletIdOrToWalletIdOrderByCreatedAtDesc(Long fromWalletId, Long toWalletId);

    // Count transactions by user
    @Query("SELECT COUNT(t) FROM CoinTransaction t WHERE t.fromUser.id = :userId OR t.toUser.id = :userId")
    Long countUserTransactions(@Param("userId") Long userId);

    // Sum earnings by user
    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM CoinTransaction t WHERE t.toUser.id = :userId AND t.type = 'EARN'")
    java.math.BigDecimal sumEarningsByUserId(@Param("userId") Long userId);

    // Sum spending by user
    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM CoinTransaction t WHERE t.fromUser.id = :userId AND t.type = 'SPEND'")
    java.math.BigDecimal sumSpendingByUserId(@Param("userId") Long userId);

    // Find recent transactions
    @Query("SELECT t FROM CoinTransaction t ORDER BY t.createdAt DESC")
    List<CoinTransaction> findRecentTransactions();

    // Find pending escrow transactions
    List<CoinTransaction> findByTypeAndStatus(CoinTransaction.TransactionType type, CoinTransaction.TransactionStatus status);

    // Find transactions by date range
    @Query("SELECT t FROM CoinTransaction t WHERE t.createdAt >= :startDate AND t.createdAt <= :endDate ORDER BY t.createdAt DESC")
    List<CoinTransaction> findTransactionsInDateRange(@Param("startDate") java.time.LocalDateTime startDate,
                                                      @Param("endDate") java.time.LocalDateTime endDate);

    // ENHANCED: Find photo-related transactions
    @Query("SELECT t FROM CoinTransaction t WHERE t.referenceId LIKE 'PHOTO-%' ORDER BY t.createdAt DESC")
    List<CoinTransaction> findPhotoRelatedTransactions();

    // ENHANCED: Find marketplace-related transactions
    @Query("SELECT t FROM CoinTransaction t WHERE t.referenceId LIKE 'ORDER-%' OR t.category = 'MARKETPLACE_ACTIVITY' ORDER BY t.createdAt DESC")
    List<CoinTransaction> findMarketplaceRelatedTransactions();

    // ENHANCED: Find lottery-related transactions
    @Query("SELECT t FROM CoinTransaction t WHERE t.category IN ('LOTTERY_WIN', 'LOTTERY_PARTICIPATION') ORDER BY t.createdAt DESC")
    List<CoinTransaction> findLotteryRelatedTransactions();

    // Statistics queries
    @Query("SELECT COUNT(t) FROM CoinTransaction t WHERE t.type = :type")
    Long countByType(@Param("type") CoinTransaction.TransactionType type);

    @Query("SELECT COUNT(t) FROM CoinTransaction t WHERE t.category = :category")
    Long countByCategory(@Param("category") CoinTransaction.TransactionCategory category);

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM CoinTransaction t WHERE t.type = :type")
    java.math.BigDecimal sumAmountByType(@Param("type") CoinTransaction.TransactionType type);

    // ENHANCED: Find reversible transactions (for photo deletion)
    @Query("SELECT t FROM CoinTransaction t WHERE t.referenceId = :referenceId AND t.type = 'EARN' AND t.status = 'COMPLETED'")
    List<CoinTransaction> findReversibleTransactionsByReference(@Param("referenceId") String referenceId);
}