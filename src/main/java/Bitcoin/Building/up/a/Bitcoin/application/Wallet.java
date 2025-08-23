package Bitcoin.Building.up.a.Bitcoin.application;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Entity representing a user's wallet for the coin system
 */
@Entity
@Table(name = "wallets")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = {"user"})
@EqualsAndHashCode(exclude = {"user"})
public class Wallet {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal balance = BigDecimal.ZERO;

    @Column(name = "pending_balance", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal pendingBalance = BigDecimal.ZERO;

    @Column(name = "total_earned", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal totalEarned = BigDecimal.ZERO;

    @Column(name = "total_spent", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal totalSpent = BigDecimal.ZERO;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }

    /**
     * Add coins to the wallet
     */
    public void addCoins(BigDecimal amount) {
        this.balance = this.balance.add(amount);
        this.totalEarned = this.totalEarned.add(amount);
        this.updatedAt = LocalDateTime.now();
    }

    /**
     * Deduct coins from the wallet
     * @return true if successful, false if insufficient balance
     */
    public boolean deductCoins(BigDecimal amount) {
        if (this.balance.compareTo(amount) >= 0) {
            this.balance = this.balance.subtract(amount);
            this.totalSpent = this.totalSpent.add(amount);
            this.updatedAt = LocalDateTime.now();
            return true;
        }
        return false;
    }

    /**
     * Check if wallet has sufficient balance
     */
    public boolean hasSufficientBalance(BigDecimal amount) {
        return this.balance.compareTo(amount) >= 0;
    }

    /**
     * Get available balance (total minus pending)
     */
    public BigDecimal getAvailableBalance() {
        return this.balance.subtract(this.pendingBalance.abs());
    }

    /**
     * Add to balance (for earnings)
     */
    public void addToBalance(BigDecimal amount) {
        this.balance = this.balance.add(amount);
        this.totalEarned = this.totalEarned.add(amount);
        this.updatedAt = LocalDateTime.now();
    }

    /**
     * Subtract from balance (for spending)
     */
    public void subtractFromBalance(BigDecimal amount) {
        this.balance = this.balance.subtract(amount);
        this.totalSpent = this.totalSpent.add(amount);
        this.updatedAt = LocalDateTime.now();
    }

    /**
     * Add to pending balance (for escrow)
     */
    public void addToPending(BigDecimal amount) {
        this.pendingBalance = this.pendingBalance.add(amount);
        this.updatedAt = LocalDateTime.now();
    }

    /**
     * Release from pending (escrow release or refund)
     */
    public void releasePending(BigDecimal amount) {
        this.pendingBalance = this.pendingBalance.subtract(amount.abs());
        if (amount.compareTo(BigDecimal.ZERO) > 0) {
            this.balance = this.balance.add(amount);
        }
        this.updatedAt = LocalDateTime.now();
    }
}