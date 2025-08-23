// 1. Notification.java - Entity for storing notifications
package Bitcoin.Building.up.a.Bitcoin.application;

import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "notifications")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 50)
    @Enumerated(EnumType.STRING)
    private NotificationType type;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    @Column(length = 1000)
    private String data; // JSON data for additional information

    @Column(nullable = false)
    @Builder.Default
    private Boolean isRead = false;

    @Column(nullable = false)
    @Builder.Default
    private Boolean emailSent = false;

    @Column(nullable = false)
    @Builder.Default
    private Boolean pushSent = false;

    @Column
    private String imageUrl; // Optional image for rich notifications

    @Column
    private String actionUrl; // Optional URL for click actions

    @Column(nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column
    private LocalDateTime readAt;

    @Column(nullable = false)
    @Builder.Default
    private Integer priority = 1; // 1=Low, 2=Normal, 3=High, 4=Urgent

    public enum NotificationType {
        LOTTERY_WINNER,           // You won the lottery!
        LOTTERY_RESULT,           // Lottery draw completed
        PHOTO_UPLOADED,           // Photo uploaded successfully
        PHOTO_FEATURED,           // Your photo was featured
        COUNTDOWN_1HOUR,          // 1 hour until lottery draw
        COUNTDOWN_10MIN,          // 10 minutes until lottery draw
        SYSTEM_MAINTENANCE,       // System maintenance notification
        WELCOME,                  // Welcome new user
        ACHIEVEMENT_UNLOCKED,     // Achievement/badge earned
        WEEKLY_SUMMARY           // Weekly activity summary
    }
}
