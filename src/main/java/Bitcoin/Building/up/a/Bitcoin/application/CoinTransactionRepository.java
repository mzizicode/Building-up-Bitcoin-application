package Bitcoin.Building.up.a.Bitcoin.application;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Repository interface for CoinTransaction operations
 */
@Repository
public interface CoinTransactionRepository extends JpaRepository<CoinTransaction, Long> {

    /**
     * Find all transactions for a user (as sender or receiver)
     */
    @Query("SELECT t FROM CoinTransaction t WHERE t.fromUser.id = :userId OR t.toUser.id = :userId ORDER BY t.createdAt DESC")
    List<CoinTransaction> findUserTransactions(@Param("userId") Long userId);

    /**
     * Find transactions with pagination
     */
    @Query(value = "SELECT * FROM coin_transactions WHERE from_user_id = :userId OR to_user_id = :userId ORDER BY created_at DESC LIMIT :limit OFFSET :offset",
            nativeQuery = true)
    List<CoinTransaction> findUserTransactionsWithPagination(@Param("userId") Long userId,
                                                             @Param("offset") int offset,
                                                             @Param("limit") int limit);

    /**
     * Find transactions by type
     */
    List<CoinTransaction> findByType(CoinTransaction.TransactionType type);

    /**
     * Find transactions by category
     */
    List<CoinTransaction> findByCategory(CoinTransaction.TransactionCategory category);

    /**
     * Find transactions by status
     */
    List<CoinTransaction> findByStatus(CoinTransaction.TransactionStatus status);

    /**
     * Find transaction by reference ID
     */
    Optional<CoinTransaction> findByReferenceId(String referenceId);

    /**
     * Find escrow transaction by reference ID
     */
    Optional<CoinTransaction> findByReferenceIdAndTypeAndStatus(
            String referenceId,
            CoinTransaction.TransactionType type,
            CoinTransaction.TransactionStatus status);

    /**
     * Find transactions in date range
     */
    @Query("SELECT t FROM CoinTransaction t WHERE t.createdAt BETWEEN :startDate AND :endDate")
    List<CoinTransaction> findTransactionsInDateRange(@Param("startDate") LocalDateTime startDate,
                                                      @Param("endDate") LocalDateTime endDate);

    /**
     * Calculate total earned by user
     */
    @Query("SELECT SUM(t.amount) FROM CoinTransaction t WHERE t.toUser.id = :userId AND t.type = 'EARN'")
    BigDecimal calculateTotalEarnedByUser(@Param("userId") Long userId);

    /**
     * Calculate total spent by user
     */
    @Query("SELECT SUM(t.amount) FROM CoinTransaction t WHERE t.fromUser.id = :userId AND t.type = 'SPEND'")
    BigDecimal calculateTotalSpentByUser(@Param("userId") Long userId);

    /**
     * Find pending escrow transactions
     */
    @Query("SELECT t FROM CoinTransaction t WHERE t.type = 'ESCROW_HOLD' AND t.status = 'ESCROWED'")
    List<CoinTransaction> findPendingEscrowTransactions();

    /**
     * Count transactions by type for user
     */
    @Query("SELECT COUNT(t) FROM CoinTransaction t WHERE (t.fromUser.id = :userId OR t.toUser.id = :userId) AND t.type = :type")
    Long countUserTransactionsByType(@Param("userId") Long userId, @Param("type") CoinTransaction.TransactionType type);
}