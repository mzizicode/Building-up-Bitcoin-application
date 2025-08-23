// RewardAction.java - For configuring reward system
package Bitcoin.Building.up.a.Bitcoin.application;

import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.math.BigDecimal;

@Entity
@Table(name = "reward_actions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class RewardAction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "action_type", nullable = false, length = 50, unique = true)
    private String actionType;

    @Column(name = "coin_reward", nullable = false, precision = 15, scale = 2)
    private BigDecimal coinReward;

    @Column(name = "max_daily")
    @Builder.Default
    private Integer maxDaily = -1; // -1 for unlimited

    @Column(name = "max_total")
    @Builder.Default
    private Integer maxTotal = -1; // -1 for unlimited

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @Column(columnDefinition = "TEXT")
    private String description;
}
