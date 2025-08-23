package Bitcoin.Building.up.a.Bitcoin.application;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;
    private final ObjectMapper objectMapper;

    @Value("${app.frontend.url:http://localhost:3000}")
    private String frontendUrl;

    // Create and send notification
    @Async
    @Transactional
    public CompletableFuture<Notification> createAndSendNotification(
            Long userId,
            Notification.NotificationType type,
            String title,
            String message,
            Map<String, Object> data,
            String imageUrl,
            String actionUrl,
            Integer priority) {

        try {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found: " + userId));

            // Create notification
            Notification notification = Notification.builder()
                    .user(user)
                    .type(type)
                    .title(title)
                    .message(message)
                    .data(data != null ? objectMapper.writeValueAsString(data) : null)
                    .imageUrl(imageUrl)
                    .actionUrl(actionUrl != null ? actionUrl : getDefaultActionUrl(type))
                    .priority(priority != null ? priority : getDefaultPriority(type))
                    .build();

            // Save notification
            Notification savedNotification = notificationRepository.save(notification);
            log.info("Notification created: {} for user {}", type, userId);

            // Send email notification asynchronously
            if (shouldSendEmail(type)) {
                sendEmailNotification(savedNotification);
            }

            // TODO: Send push notification (implement when needed)
            // sendPushNotification(savedNotification);

            return CompletableFuture.completedFuture(savedNotification);

        } catch (Exception e) {
            log.error("Failed to create notification for user {}: {}", userId, e.getMessage(), e);
            return CompletableFuture.failedFuture(e);
        }
    }

    // Simplified method for basic notifications
    public CompletableFuture<Notification> sendNotification(
            Long userId,
            Notification.NotificationType type,
            String title,
            String message) {
        return createAndSendNotification(userId, type, title, message, null, null, null, null);
    }

    // Send notification to all users (broadcast)
    @Async
    public void broadcastNotification(
            Notification.NotificationType type,
            String title,
            String message,
            String imageUrl) {

        try {
            List<User> allUsers = userRepository.findAll();
            log.info("Broadcasting notification to {} users", allUsers.size());

            for (User user : allUsers) {
                createAndSendNotification(
                        user.getId(),
                        type,
                        title,
                        message,
                        null,
                        imageUrl,
                        null,
                        2 // Normal priority for broadcasts
                );
            }

        } catch (Exception e) {
            log.error("Failed to broadcast notification: {}", e.getMessage(), e);
        }
    }

    // Lottery-specific notification methods
    public void notifyLotteryWinner(User winner, Photo winningPhoto) {
        Map<String, Object> data = new HashMap<>();
        data.put("photoId", winningPhoto.getId());
        data.put("photoDescription", winningPhoto.getDescription());
        data.put("winDate", LocalDateTime.now().toString());

        createAndSendNotification(
                winner.getId(),
                Notification.NotificationType.LOTTERY_WINNER,
                "🎉 Congratulations! You Won the Lottery!",
                String.format("Your photo \"%s\" has been selected as the lottery winner!",
                        winningPhoto.getDescription()),
                data,
                winningPhoto.getS3Url(),
                frontendUrl + "/lottery",
                4 // Urgent priority
        );

        log.info("Winner notification sent to user {} for photo {}", winner.getId(), winningPhoto.getId());
    }

    public void notifyLotteryResult(Photo winningPhoto) {
        try {
            List<User> allUsers = userRepository.findAll();

            for (User user : allUsers) {
                if (!user.getId().equals(winningPhoto.getUser().getId())) {
                    // Notify non-winners
                    createAndSendNotification(
                            user.getId(),
                            Notification.NotificationType.LOTTERY_RESULT,
                            "📸 Lottery Draw Complete",
                            String.format("This round's winner: \"%s\" by %s",
                                    winningPhoto.getDescription(),
                                    winningPhoto.getUser().getName()),
                            null,
                            winningPhoto.getS3Url(),
                            frontendUrl + "/lottery",
                            2 // Normal priority
                    );
                }
            }

            log.info("Lottery result notifications sent for winning photo {}", winningPhoto.getId());

        } catch (Exception e) {
            log.error("Failed to send lottery result notifications", e);
        }
    }

    public void notifyCountdown(int minutesRemaining) {
        Notification.NotificationType type = minutesRemaining <= 10 ?
                Notification.NotificationType.COUNTDOWN_10MIN :
                Notification.NotificationType.COUNTDOWN_1HOUR;

        String title = String.format("⏰ %d minutes until lottery draw!", minutesRemaining);
        String message = "Don't miss the excitement! The automated lottery draw is coming up soon.";

        broadcastNotification(type, title, message, null);
        log.info("Countdown notification sent: {} minutes remaining", minutesRemaining);
    }

    public void notifyPhotoUploaded(User user, Photo photo) {
        Map<String, Object> data = new HashMap<>();
        data.put("photoId", photo.getId());
        data.put("photoUrl", photo.getS3Url());

        createAndSendNotification(
                user.getId(),
                Notification.NotificationType.PHOTO_UPLOADED,
                "📸 Photo Upload Successful",
                String.format("Your photo \"%s\" has been uploaded and entered into the lottery!",
                        photo.getDescription()),
                data,
                photo.getS3Url(),
                frontendUrl + "/dashboard",
                2 // Normal priority
        );
    }

    public void sendWelcomeNotification(User user) {
        createAndSendNotification(
                user.getId(),
                Notification.NotificationType.WELCOME,
                "🎉 Welcome to Photo Lottery!",
                "Your account is ready! Upload your first photo to join the automated 24-hour lottery draws.",
                null,
                null,
                frontendUrl + "/dashboard",
                2 // Normal priority
        );
    }

    // Get user notifications
    public List<Notification> getUserNotifications(Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public List<Notification> getUnreadNotifications(Long userId) {
        return notificationRepository.findByUserIdAndIsReadFalseOrderByCreatedAtDesc(userId);
    }

    public Long getUnreadCount(Long userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    // Mark notification as read
    @Transactional
    public void markAsRead(Long notificationId, Long userId) {
        try {
            Notification notification = notificationRepository.findById(notificationId)
                    .orElseThrow(() -> new RuntimeException("Notification not found"));

            // Verify ownership
            if (!notification.getUser().getId().equals(userId)) {
                throw new SecurityException("Access denied to notification");
            }

            notification.setIsRead(true);
            notification.setReadAt(LocalDateTime.now());
            notificationRepository.save(notification);

        } catch (Exception e) {
            log.error("Failed to mark notification as read: {}", e.getMessage(), e);
        }
    }

    // Mark all notifications as read for user
    @Transactional
    public void markAllAsRead(Long userId) {
        try {
            List<Notification> unreadNotifications = getUnreadNotifications(userId);

            for (Notification notification : unreadNotifications) {
                notification.setIsRead(true);
                notification.setReadAt(LocalDateTime.now());
            }

            notificationRepository.saveAll(unreadNotifications);
            log.info("Marked {} notifications as read for user {}", unreadNotifications.size(), userId);

        } catch (Exception e) {
            log.error("Failed to mark all notifications as read for user {}: {}", userId, e.getMessage(), e);
        }
    }

    // Email notification sending
    @Async
    private void sendEmailNotification(Notification notification) {
        try {
            if (notification.getUser().getEmailVerified()) {
                emailService.sendNotificationEmail(
                        notification.getUser(),
                        notification.getTitle(),
                        notification.getMessage(),
                        notification.getActionUrl()
                );

                notification.setEmailSent(true);
                notificationRepository.save(notification);
                log.info("Email notification sent for notification {}", notification.getId());
            }
        } catch (Exception e) {
            log.error("Failed to send email notification {}: {}", notification.getId(), e.getMessage(), e);
        }
    }

    // Utility methods
    private boolean shouldSendEmail(Notification.NotificationType type) {
        return switch (type) {
            case LOTTERY_WINNER, COUNTDOWN_1HOUR, COUNTDOWN_10MIN, WELCOME -> true;
            case LOTTERY_RESULT, PHOTO_UPLOADED, SYSTEM_MAINTENANCE -> false;
            default -> false;
        };
    }

    private Integer getDefaultPriority(Notification.NotificationType type) {
        return switch (type) {
            case LOTTERY_WINNER -> 4; // Urgent
            case COUNTDOWN_10MIN -> 3; // High
            case COUNTDOWN_1HOUR, LOTTERY_RESULT, WELCOME -> 2; // Normal
            default -> 1; // Low
        };
    }

    private String getDefaultActionUrl(Notification.NotificationType type) {
        return switch (type) {
            case LOTTERY_WINNER, LOTTERY_RESULT, COUNTDOWN_1HOUR, COUNTDOWN_10MIN -> frontendUrl + "/lottery";
            case PHOTO_UPLOADED -> frontendUrl + "/dashboard";
            case WELCOME -> frontendUrl + "/dashboard";
            default -> frontendUrl;
        };
    }

    // Cleanup old notifications (run periodically)
    @Transactional
    public void cleanupOldNotifications() {
        try {
            LocalDateTime cutoffDate = LocalDateTime.now().minusDays(30); // Keep notifications for 30 days
            notificationRepository.deleteByCreatedAtBefore(cutoffDate);
            log.info("Cleaned up notifications older than {}", cutoffDate);
        } catch (Exception e) {
            log.error("Failed to cleanup old notifications: {}", e.getMessage(), e);
        }
    }
}
