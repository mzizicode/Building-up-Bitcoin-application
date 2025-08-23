package Bitcoin.Building.up.a.Bitcoin.application;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class CountdownIntegrationService {

    private final NotificationService notificationService;

    /**
     * Call this method from your frontend countdown logic or scheduled job
     * when certain time thresholds are reached
     */
    public void handleCountdownMilestone(int minutesRemaining) {
        try {
            log.info("Countdown milestone reached: {} minutes remaining", minutesRemaining);

            if (minutesRemaining == 60) {
                // Send 1-hour notification
                notificationService.notifyCountdown(60);
                log.info("1-hour countdown notification sent");
            } else if (minutesRemaining == 10) {
                // Send 10-minute notification
                notificationService.notifyCountdown(10);
                log.info("10-minute countdown notification sent");
            } else if (minutesRemaining == 1) {
                // Send final minute notification
                notificationService.notifyCountdown(1);
                log.info("Final minute countdown notification sent");
            }

        } catch (Exception e) {
            log.error("Error handling countdown milestone for {} minutes: {}", minutesRemaining, e.getMessage(), e);
        }
    }

    /**
     * Calculate minutes remaining until next draw
     * You can call this from your frontend or use it in scheduled jobs
     */
    public int getMinutesUntilDraw(LocalDateTime nextDrawTime) {
        if (nextDrawTime == null) {
            return 0;
        }

        LocalDateTime now = LocalDateTime.now();
        if (nextDrawTime.isBefore(now)) {
            return 0;
        }

        return (int) ChronoUnit.MINUTES.between(now, nextDrawTime);
    }

    /**
     * Check if we should send a countdown notification for the given time remaining
     */
    public boolean shouldSendCountdownNotification(int minutesRemaining) {
        return minutesRemaining == 60 || minutesRemaining == 10 || minutesRemaining == 1;
    }
}