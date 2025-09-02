// src/services/NotificationService.js - Complete Notification Service
class NotificationService {
    constructor() {
        this.subscribers = [];
        this.notifications = [];
        console.log('🔔 NotificationService initialized');
    }

    // Subscribe to notifications
    subscribe(callback) {
        console.log('🔔 New subscriber added to NotificationService');
        this.subscribers.push(callback);

        // Return unsubscribe function
        return () => {
            console.log('🔔 Subscriber removed from NotificationService');
            this.subscribers = this.subscribers.filter(sub => sub !== callback);
        };
    }

    // Notify all subscribers
    notify(notification) {
        console.log('🔔 NotificationService broadcasting:', notification);

        // Add timestamp and ID
        const enhancedNotification = {
            id: Date.now() + Math.random(),
            timestamp: Date.now(),
            read: false,
            ...notification, // ✅ fixed (was ".notification") :contentReference[oaicite:0]{index=0}
        };

        // Store notification
        this.notifications.unshift(enhancedNotification);

        // Keep only last 50 notifications
        if (this.notifications.length > 50) {
            this.notifications = this.notifications.slice(0, 50);
        }

        // Notify all subscribers
        this.subscribers.forEach(callback => {
            try {
                callback(enhancedNotification);
            } catch (error) {
                console.error('🔔 Error in notification callback:', error);
            }
        });

        // Try to show browser notification if permission granted
        this.showBrowserNotification(enhancedNotification);
    }

    // Show browser notification
    showBrowserNotification(notification) {
        if ('Notification' in window && Notification.permission === 'granted') {
            try {
                new Notification(notification.title, {
                    body: notification.message,
                    icon: notification.icon || '/favicon.ico',
                    badge: '/favicon.ico',
                    tag: notification.type || 'general',
                    requireInteraction: notification.urgent || false,
                    silent: false
                });
            } catch (error) {
                console.warn('🔔 Browser notification failed:', error);
            }
        }
    }

    // Request notification permission
    async requestPermission() {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            console.log('🔔 Notification permission:', permission);
            return permission;
        }
        return 'denied';
    }

    // Countdown notifications (time in minutes)
    triggerCountdown(minutesRemaining) {
        let title, message, urgent = false;

        if (minutesRemaining === 60) {
            title = '⏰ 1 Hour Until Draw!';
            message = 'The automated lottery draw is in 1 hour. Make sure your photos are uploaded!';
        } else if (minutesRemaining === 10) {
            title = '🚨 10 Minutes Until Draw!';
            message = 'Final countdown! Lottery draw happening in 10 minutes.';
            urgent = true;
        } else if (minutesRemaining === 1) {
            title = '🔥 1 MINUTE LEFT!';
            message = 'Lottery drawing in 60 seconds! Get ready...';
            urgent = true;
        } else {
            title = `⏰ ${minutesRemaining} Minutes Left`;
            message = `Automated lottery draw in ${minutesRemaining} minutes.`;
        }

        this.notify({ type: 'countdown', title, message, urgent, icon: '⏰' });
    }

    // Lottery draw notification
    triggerLotteryDraw(photoCount) {
        this.notify({
            type: 'lottery',
            title: '🎰 Lottery Draw Starting!',
            message: `Selecting winner from ${photoCount} photos. The suspense builds...`,
            urgent: true,
            icon: '🎰'
        });
    }

    // Winner notification
    triggerWinner(winner) {
        this.notify({
            type: 'winner',
            title: '🏆 We Have a Winner!',
            message: `"${winner.description}" by ${winner.user} won the 24-hour lottery!`,
            urgent: false,
            icon: '🏆',
            data: winner
        });
    }

    // Upload confirmation
    triggerUpload(photoDescription) {
        this.notify({
            type: 'upload',
            title: '📸 Photo Uploaded!',
            message: `"${photoDescription}" successfully uploaded to S3 and entered in lottery.`,
            urgent: false,
            icon: '📸'
        });
    }

    // Photo submission confirmation
    triggerSubmission(photoDescription) {
        this.notify({
            type: 'upload',
            title: '✅ Photo Submitted!',
            message: `"${photoDescription}" is now entered in the 24-hour auto lottery!`,
            urgent: false,
            icon: '✅'
        });
    }

    // Error notifications
    triggerError(errorMessage) {
        this.notify({
            type: 'error',
            title: '⚠️ Error',
            message: errorMessage,
            urgent: true,
            icon: '⚠️'
        });
    }

    // System notifications
    triggerSystem(title, message) {
        this.notify({
            type: 'system',
            title,
            message,
            urgent: false,
            icon: '🔔'
        });
    }

    // Get all notifications
    getAllNotifications() {
        return [...this.notifications]; // ✅ fixed (was "[.this.notifications]") :contentReference[oaicite:1]{index=1}
    }

    clearAll() {
        console.log('🔔 Clearing all notifications');
        this.notifications = [];
    }

    markAsRead(notificationId) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification) {
            notification.read = true;
            console.log('🔔 Marked notification as read:', notificationId);
        }
    }

    getUnreadCount() {
        return this.notifications.filter(n => !n.read).length;
    }

    // Dev test
    triggerTest() {
        this.notify({
            type: 'test',
            title: '🧪 Test Notification',
            message: 'This is a test notification to verify the system is working.',
            urgent: false,
            icon: '🧪'
        });
    }
}

// Singleton
const notificationService = new NotificationService();

// Auto-request permission in browser
if (typeof window !== 'undefined') {
    notificationService.requestPermission();
}

export default notificationService;
