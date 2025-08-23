package Bitcoin.Building.up.a.Bitcoin.application;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/notifications")
@Tag(name = "Notifications", description = "User notification management endpoints")
public class NotificationController {

    private final NotificationService notificationService;
    private final UserRepository userRepository;

    /**
     * Get all notifications for the current user
     */
    @GetMapping
    @Operation(summary = "Get user notifications", description = "Retrieve all notifications for the current user")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<?> getUserNotifications() {
        try {
            User currentUser = getCurrentUser();
            List<Notification> notifications = notificationService.getUserNotifications(currentUser.getId());

            List<Map<String, Object>> notificationData = notifications.stream()
                    .map(this::createNotificationResponse)
                    .collect(Collectors.toList());

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "notifications", notificationData,
                    "totalCount", notificationData.size()
            ));

        } catch (Exception e) {
            log.error("Failed to get user notifications", e);
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "message", "Failed to retrieve notifications"
            ));
        }
    }

    /**
     * Get unread notifications for the current user
     */
    @GetMapping("/unread")
    @Operation(summary = "Get unread notifications", description = "Retrieve unread notifications for the current user")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<?> getUnreadNotifications() {
        try {
            User currentUser = getCurrentUser();
            List<Notification> notifications = notificationService.getUnreadNotifications(currentUser.getId());

            List<Map<String, Object>> notificationData = notifications.stream()
                    .map(this::createNotificationResponse)
                    .collect(Collectors.toList());

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "notifications", notificationData,
                    "unreadCount", notificationData.size()
            ));

        } catch (Exception e) {
            log.error("Failed to get unread notifications", e);
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "message", "Failed to retrieve unread notifications"
            ));
        }
    }

    /**
     * Get unread notification count
     */
    @GetMapping("/unread/count")
    @Operation(summary = "Get unread count", description = "Get the count of unread notifications")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<?> getUnreadCount() {
        try {
            User currentUser = getCurrentUser();
            Long unreadCount = notificationService.getUnreadCount(currentUser.getId());

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "unreadCount", unreadCount
            ));

        } catch (Exception e) {
            log.error("Failed to get unread count", e);
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "message", "Failed to get unread count"
            ));
        }
    }

    /**
     * Mark a specific notification as read
     */
    @PutMapping("/{notificationId}/read")
    @Operation(summary = "Mark notification as read", description = "Mark a specific notification as read")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<?> markAsRead(@PathVariable Long notificationId) {
        try {
            User currentUser = getCurrentUser();
            notificationService.markAsRead(notificationId, currentUser.getId());

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Notification marked as read"
            ));

        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of(
                    "success", false,
                    "message", "Access denied"
            ));
        } catch (Exception e) {
            log.error("Failed to mark notification as read", e);
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "message", "Failed to mark notification as read"
            ));
        }
    }

    /**
     * Mark all notifications as read for the current user
     */
    @PutMapping("/read-all")
    @Operation(summary = "Mark all as read", description = "Mark all notifications as read for the current user")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<?> markAllAsRead() {
        try {
            User currentUser = getCurrentUser();
            notificationService.markAllAsRead(currentUser.getId());

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "All notifications marked as read"
            ));

        } catch (Exception e) {
            log.error("Failed to mark all notifications as read", e);
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "message", "Failed to mark all notifications as read"
            ));
        }
    }

    /**
     * Send test notification (for development/testing)
     */
    @PostMapping("/test")
    @Operation(summary = "Send test notification", description = "Send a test notification (development only)")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<?> sendTestNotification() {
        try {
            User currentUser = getCurrentUser();

            notificationService.sendNotification(
                    currentUser.getId(),
                    Notification.NotificationType.SYSTEM_MAINTENANCE,
                    "🧪 Test Notification",
                    "This is a test notification to verify the notification system is working correctly."
            );

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Test notification sent successfully"
            ));

        } catch (Exception e) {
            log.error("Failed to send test notification", e);
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "message", "Failed to send test notification"
            ));
        }
    }

    /**
     * 🚀 NEW: Trigger countdown notification (for frontend integration)
     */
    @PostMapping("/countdown/{minutes}")
    @Operation(summary = "Trigger countdown notification", description = "Trigger countdown notification for specified minutes")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<?> triggerCountdownNotification(@PathVariable int minutes) {
        try {
            if (minutes == 60 || minutes == 10 || minutes == 1) {
                notificationService.notifyCountdown(minutes);
                return ResponseEntity.ok(Map.of(
                        "success", true,
                        "message", "Countdown notification sent for " + minutes + " minutes"
                ));
            } else {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "Invalid countdown time. Use 60, 10, or 1 minutes."
                ));
            }
        } catch (Exception e) {
            log.error("Failed to trigger countdown notification", e);
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "message", "Failed to send countdown notification"
            ));
        }
    }

    /**
     * Get notification preferences for the current user
     */
    @GetMapping("/preferences")
    @Operation(summary = "Get notification preferences", description = "Get notification preferences for the current user")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<?> getNotificationPreferences() {
        try {
            User currentUser = getCurrentUser();

            // TODO: Implement user notification preferences
            Map<String, Object> preferences = new HashMap<>();
            preferences.put("emailNotifications", true);
            preferences.put("pushNotifications", true);
            preferences.put("lotteryResults", true);
            preferences.put("countdownAlerts", true);
            preferences.put("photoUpdates", true);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "preferences", preferences
            ));

        } catch (Exception e) {
            log.error("Failed to get notification preferences", e);
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "message", "Failed to get notification preferences"
            ));
        }
    }

    // Utility methods
    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new RuntimeException("User not authenticated");
        }

        String email = authentication.getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found: " + email));
    }

    private Map<String, Object> createNotificationResponse(Notification notification) {
        Map<String, Object> response = new HashMap<>();
        response.put("id", notification.getId());
        response.put("type", notification.getType().toString());
        response.put("title", notification.getTitle());
        response.put("message", notification.getMessage());
        response.put("data", notification.getData());
        response.put("imageUrl", notification.getImageUrl());
        response.put("actionUrl", notification.getActionUrl());
        response.put("isRead", notification.getIsRead());
        response.put("priority", notification.getPriority());
        response.put("createdAt", notification.getCreatedAt().toString());
        response.put("readAt", notification.getReadAt() != null ? notification.getReadAt().toString() : null);
        return response;
    }
}