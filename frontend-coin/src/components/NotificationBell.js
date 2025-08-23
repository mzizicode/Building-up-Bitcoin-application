import React, { useState, useEffect, useRef } from 'react';
import notificationService from '../services/NotificationService';
import './NotificationBell.css';

const NotificationBell = () => {
    const [unreadCount, setUnreadCount] = useState(0);
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        loadUnreadCount();

        // Poll for new notifications every 30 seconds
        const interval = setInterval(loadUnreadCount, 30000);

        // Close dropdown when clicking outside
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            clearInterval(interval);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const loadUnreadCount = async () => {
        const count = await notificationService.getUnreadCount();
        setUnreadCount(count);
    };

    const loadNotifications = async () => {
        setIsLoading(true);
        const result = await notificationService.getUnreadNotifications();
        if (result.success) {
            setNotifications(result.notifications);
        }
        setIsLoading(false);
    };

    const handleBellClick = () => {
        setIsOpen(!isOpen);
        if (!isOpen && notifications.length === 0) {
            loadNotifications();
        }
    };

    const handleNotificationClick = async (notification) => {
        // Mark as read
        await notificationService.markAsRead(notification.id);

        // Update local state
        setNotifications(notifications.filter(n => n.id !== notification.id));
        setUnreadCount(Math.max(0, unreadCount - 1));

        // Navigate to action URL if provided
        if (notification.actionUrl) {
            window.open(notification.actionUrl, '_self');
        }
    };

    const handleMarkAllRead = async () => {
        const result = await notificationService.markAllAsRead();
        if (result.success) {
            setUnreadCount(0);
            setNotifications([]);
        }
    };

    const formatTimeAgo = (dateString) => {
        const now = new Date();
        const date = new Date(dateString);
        const diffInMinutes = Math.floor((now - date) / (1000 * 60));

        if (diffInMinutes < 1) return 'Just now';
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours}h ago`;

        const diffInDays = Math.floor(diffInHours / 24);
        return `${diffInDays}d ago`;
    };

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'LOTTERY_WINNER': return '🏆';
            case 'LOTTERY_RESULT': return '🎰';
            case 'COUNTDOWN_1HOUR': return '⏰';
            case 'COUNTDOWN_10MIN': return '🔔';
            case 'PHOTO_UPLOADED': return '📸';
            case 'WELCOME': return '🎉';
            default: return '📢';
        }
    };

    const getPriorityClass = (priority) => {
        if (priority >= 4) return 'urgent';
        if (priority >= 3) return 'high';
        return 'normal';
    };

    return (
        <div className="notification-bell-container" ref={dropdownRef}>
            <button
                className="notification-bell"
                onClick={handleBellClick}
                aria-label={`${unreadCount} unread notifications`}
            >
                🔔
                {unreadCount > 0 && (
                    <span className="notification-count">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="notification-dropdown">
                    <div className="notification-header">
                        <h3>Notifications</h3>
                        {notifications.length > 0 && (
                            <button
                                className="mark-all-read"
                                onClick={handleMarkAllRead}
                            >
                                Mark all read
                            </button>
                        )}
                    </div>

                    <div className="notification-list">
                        {isLoading ? (
                            <div className="notification-loading">
                                <div className="loading-spinner"></div>
                                <p>Loading notifications...</p>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="no-notifications">
                                <span className="no-notifications-icon">🔕</span>
                                <p>No new notifications</p>
                            </div>
                        ) : (
                            notifications.map(notification => (
                                <div
                                    key={notification.id}
                                    className={`notification-item ${getPriorityClass(notification.priority)}`}
                                    onClick={() => handleNotificationClick(notification)}
                                >
                                    <div className="notification-icon">
                                        {notification.imageUrl ? (
                                            <img
                                                src={notification.imageUrl}
                                                alt=""
                                                className="notification-image"
                                            />
                                        ) : (
                                            <span className="notification-type-icon">
                                                {getNotificationIcon(notification.type)}
                                            </span>
                                        )}
                                    </div>
                                    <div className="notification-content">
                                        <h4>{notification.title}</h4>
                                        <p>{notification.message}</p>
                                        <span className="notification-time">
                                            {formatTimeAgo(notification.createdAt)}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="notification-footer">
                        <button
                            className="view-all-btn"
                            onClick={() => {
                                setIsOpen(false);
                                // Navigate to notifications page when implemented
                                // navigate('/notifications');
                            }}
                        >
                            View all notifications
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;