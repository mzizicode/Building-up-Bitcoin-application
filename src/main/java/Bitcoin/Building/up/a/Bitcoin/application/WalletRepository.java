package Bitcoin.Building.up.a.Bitcoin.application;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

/**
 * Repository interface for Wallet operations
 */
@Repository
public interface WalletRepository extends JpaRepository<Wallet, Long> {

    /**
     * Find wallet by user ID
     */
    Optional<Wallet> findByUserId(Long userId);

    /**
     * Find wallet by user email
     */
    @Query("SELECT w FROM Wallet w WHERE w.user.email = :email")
    Optional<Wallet> findByUserEmail(@Param("email") String email);

    /**
     * Check if wallet exists for user
     */
    boolean existsByUserId(Long userId);

    /**
     * Find wallets with balance greater than specified amount
     */
    List<Wallet> findByBalanceGreaterThan(BigDecimal amount);

    /**
     * Find top earners
     */
    @Query("SELECT w FROM Wallet w ORDER BY w.totalEarned DESC")
    List<Wallet> findTopEarners();

    /**
     * Get total coins in circulation
     */
    @Query("SELECT SUM(w.balance) FROM Wallet w")
    BigDecimal getTotalCoinsInCirculation();

    /**
     * Get average wallet balance
     */
    @Query("SELECT AVG(w.balance) FROM Wallet w")
    BigDecimal getAverageWalletBalance();

    /**
     * Find wallets with pending balance
     */
    @Query("SELECT w FROM Wallet w WHERE w.pendingBalance > 0")
    List<Wallet> findWalletsWithPendingBalance();
}