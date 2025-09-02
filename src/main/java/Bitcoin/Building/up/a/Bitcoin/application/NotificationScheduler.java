package Bitcoin.Building.up.a.Bitcoin.application;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import Bitcoin.Building.up.a.Bitcoin.application.PhotoStatus;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationScheduler {

    private final NotificationService notificationService;
    private final PhotoRepository photoRepository;

    // Track sent notifications to avoid duplicates
    private final Set<String> sentNotifications = ConcurrentHashMap.newKeySet();

    @Value("${lottery.draw.interval.hours:24}")
    private int lotteryIntervalHours;

    @Value("${lottery.start.time:2025-01-01T00:00:00}")
    private String lotteryStartTime;

    /**
     * Check if countdown notifications should be sent
     */
    @Scheduled(fixedRate = 60000) // Check every minute
    public void checkCountdownNotifications() {
        try {
            LocalDateTime now = LocalDateTime.now();
            LocalDateTime nextDrawTime = calculateNextDrawTime(now);

            if (nextDrawTime == null) {
                return;
            }

            long minutesUntilDraw = ChronoUnit.MINUTES.between(now, nextDrawTime);

            // Send notifications at specific intervals
            if (minutesUntilDraw == 60) {
                sendCountdownNotification(60, "1-hour");
            } else if (minutesUntilDraw == 30) {
                sendCountdownNotification(30, "30-minute");
            } else if (minutesUntilDraw == 10) {
                sendCountdownNotification(10, "10-minute");
            } else if (minutesUntilDraw == 5) {
                sendCountdownNotification(5, "5-minute");
            } else if (minutesUntilDraw == 1) {
                sendCountdownNotification(1, "1-minute");
            }

            // Auto-spin lottery when time is up
            if (minutesUntilDraw <= 0) {
                performAutomaticLotteryDraw();
            }

        } catch (Exception e) {
            log.error("Error in countdown notification scheduler", e);
        }
    }

    private void sendCountdownNotification(int minutes, String timeKey) {
        String notificationKey = timeKey + "-" + getCurrentDrawCycle();

        if (sentNotifications.contains(notificationKey)) {
            return; // Already sent this notification for this cycle
        }

        notificationService.notifyCountdown(minutes);
        sentNotifications.add(notificationKey);

        log.info("Sent {} countdown notification", timeKey);
    }

    private void performAutomaticLotteryDraw() {
        try {
            String drawKey = "auto-draw-" + getCurrentDrawCycle();

            if (sentNotifications.contains(drawKey)) {
                return; // Already performed draw for this cycle
            }

            // Check if there are submitted photos
            long submittedCount = photoRepository.countByStatus(PhotoStatus.IN_DRAW);


            if (submittedCount == 0) {
                log.info("No photos submitted for automatic lottery draw");
                notificationService.broadcastNotification(
                        Notification.NotificationType.LOTTERY_RESULT,
                        "📸 No Winner This Round",
                        "No photos were submitted for this lottery cycle. Next draw in 24 hours!",
                        null
                );
            } else {
                // Perform automatic lottery spin
                log.info("Performing automatic lottery draw with {} submitted photos", submittedCount);
                // You would call your lottery spin logic here
                // This could be extracted to a LotteryService
                performLotteryDraw();
            }

            sentNotifications.add(drawKey);

            // Clean up old notifications to prevent memory leak
            if (sentNotifications.size() > 1000) {
                sentNotifications.clear();
            }

        } catch (Exception e) {
            log.error("Error performing automatic lottery draw", e);
        }
    }

    private void performLotteryDraw() {
        // This is simplified - you'd want to extract this to a service
        // and integrate with your existing lottery spin logic
        log.info("🎰 Automatic lottery draw triggered by scheduler");
        // Call your lottery service here
    }

    private LocalDateTime calculateNextDrawTime(LocalDateTime current) {
        try {
            // Parse start time and calculate next draw based on interval
            LocalDateTime startTime = LocalDateTime.parse(lotteryStartTime);

            // Calculate how many intervals have passed since start
            long hoursSinceStart = ChronoUnit.HOURS.between(startTime, current);
            long completedIntervals = hoursSinceStart / lotteryIntervalHours;

            // Calculate next draw time
            return startTime.plusHours((completedIntervals + 1) * lotteryIntervalHours);

        } catch (Exception e) {
            log.error("Error calculating next draw time", e);
            return null;
        }
    }

    private String getCurrentDrawCycle() {
        // Generate a unique identifier for the current draw cycle
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime startTime = LocalDateTime.parse(lotteryStartTime);
        long hoursSinceStart = ChronoUnit.HOURS.between(startTime, now);
        long currentCycle = hoursSinceStart / lotteryIntervalHours;
        return String.valueOf(currentCycle);
    }

    /**
     * Clean up old notifications daily
     */
    @Scheduled(cron = "0 0 2 * * ?") // Run daily at 2 AM
    public void cleanupOldNotifications() {
        try {
            log.info("Starting daily notification cleanup...");
            notificationService.cleanupOldNotifications();

            // Clear sent notifications tracking
            sentNotifications.clear();

            log.info("Daily notification cleanup completed");
        } catch (Exception e) {
            log.error("Error during notification cleanup", e);
        }
    }

    /**
     * Send daily reminder to upload photos
     */
    @Scheduled(cron = "0 0 10 * * ?") // Run daily at 10 AM
    public void sendDailyReminder() {
        try {
            notificationService.broadcastNotification(
                    Notification.NotificationType.COUNTDOWN_1HOUR,
                    "📸 Daily Photo Reminder",
                    "Don't forget to upload your photos for today's lottery draw! Every photo has a chance to win.",
                    null
            );
            log.info("Sent daily photo upload reminder");
        } catch (Exception e) {
            log.error("Error sending daily reminder", e);
        }
    }
}