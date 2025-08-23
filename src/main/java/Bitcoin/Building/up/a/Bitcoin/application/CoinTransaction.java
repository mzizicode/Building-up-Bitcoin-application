package Bitcoin.Building.up.a.Bitcoin.application;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Entity representing coin transactions in the system
 */
@Entity
@Table(name = "coin_transactions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = {"fromUser", "toUser"})
@EqualsAndHashCode(exclude = {"fromUser", "toUser"})
public class CoinTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "from_user_id")
    private User fromUser;

    @ManyToOne
    @JoinColumn(name = "to_user_id")
    private User toUser;

    @ManyToOne
    @JoinColumn(name = "from_wallet_id")
    private Wallet fromWallet;

    @ManyToOne
    @JoinColumn(name = "to_wallet_id")
    private Wallet toWallet;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, length = 50)
    @Enumerated(EnumType.STRING)
    private TransactionType type;

    @Column(length = 100)
    @Enumerated(EnumType.STRING)
    private TransactionCategory category;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "reference_id")
    private String referenceId;

    @Column(length = 20)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private TransactionStatus status = TransactionStatus.COMPLETED;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    /**
     * Transaction types
     */
    public enum TransactionType {
        EARN,
        SPEND,
        TRANSFER,
        REFUND,
        TOP_UP,
        ESCROW_HOLD,
        ESCROW_RELEASE
    }

    /**
     * Transaction categories
     */
    public enum TransactionCategory {
        PHOTO_UPLOAD,
        LOTTERY_WIN,
        PURCHASE,
        REFERRAL,
        DAILY_LOGIN,
        FIRST_PURCHASE,
        MARKETPLACE_SALE,
        MARKETPLACE_PURCHASE,
        SERVICE_FEE,
        WITHDRAWAL,
        DEPOSIT,
        BONUS,
        ACHIEVEMENT_UNLOCK,
        ESCROW_PAYMENT,
        DISPUTE_RESOLUTION,
        MANUAL_ADJUSTMENT,
        OTHER
    }

    /**
     * Transaction status
     */
    public enum TransactionStatus {
        PENDING,
        COMPLETED,
        FAILED,
        CANCELLED,
        REVERSED,
        ESCROWED
    }
}