package Bitcoin.Building.up.a.Bitcoin.application;

import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.time.LocalDateTime;

@Entity
@Table(name = "lottery_draws")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class LotteryDraw {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "winner_user_id")
    private User winner;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "winning_photo_id")
    private Photo winningPhoto;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "prize_id")
    private LotteryPrize prize;

    @Column(name = "draw_date", nullable = false)
    @Builder.Default
    private LocalDateTime drawDate = LocalDateTime.now();

    @Column(name = "total_participants")
    private Integer totalParticipants;

    @Column(name = "is_current_winner")
    @Builder.Default
    private Boolean isCurrentWinner = true;

    @Column(name = "winner_coins_awarded")
    @Builder.Default
    private Integer winnerCoinsAwarded = 100;

    @Column(name = "participant_coins_awarded")
    @Builder.Default
    private Integer participantCoinsAwarded = 20;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (drawDate == null) {
            drawDate = LocalDateTime.now();
        }
    }
}