package Bitcoin.Building.up.a.Bitcoin.application;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    // Find notifications by user ID
    List<Notification> findByUserIdOrderByCreatedAtDesc(Long userId);

    // Find unread notifications by user ID
    List<Notification> findByUserIdAndIsReadFalseOrderByCreatedAtDesc(Long userId);

    // Find notifications by user and type
    List<Notification> findByUserIdAndTypeOrderByCreatedAtDesc(Long userId, Notification.NotificationType type);

    // Count unread notifications for user
    Long countByUserIdAndIsReadFalse(Long userId);

    // Find notifications created after a specific time
    List<Notification> findByCreatedAtAfterOrderByCreatedAtDesc(LocalDateTime after);

    // Find notifications that need email sending
    List<Notification> findByEmailSentFalseAndCreatedAtAfter(LocalDateTime after);

    // Find high priority notifications
    List<Notification> findByPriorityGreaterThanEqualOrderByCreatedAtDesc(Integer priority);

    // Custom query for recent notifications with pagination
    @Query("SELECT n FROM Notification n WHERE n.user.id = :userId ORDER BY n.createdAt DESC")
    List<Notification> findRecentNotifications(@Param("userId") Long userId);

    // Delete old notifications (cleanup)
    void deleteByCreatedAtBefore(LocalDateTime cutoffDate);
}

