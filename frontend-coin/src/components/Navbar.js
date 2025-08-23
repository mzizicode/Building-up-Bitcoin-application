// src/components/Navbar.js - Updated with Notification Integration
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import notificationService from '../services/NotificationService';
import './Navbar.css';

function Navbar() {
    const navigate = useNavigate();
    const location = useLocation();
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userData, setUserData] = useState(null);
    const [showUserMenu, setShowUserMenu] = useState(false);

    // 🚀 NEW: Notification states
    const [notifications, setNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);

    useEffect(() => {
        checkAuthStatus();
    }, [location]); // Re-check when location changes

    // 🚀 NEW: Subscribe to notifications when component mounts
    useEffect(() => {
        // Only subscribe to notifications if user is logged in
        if (isLoggedIn) {
            console.log('🔔 Navbar subscribing to notifications...');
            const unsubscribe = notificationService.subscribe((notification) => {
                console.log('🔔 Navbar received notification:', notification);

                // Add notification to the list
                setNotifications(prev => {
                    const newNotifications = [notification, ...prev].slice(0, 10); // Keep only latest 10
                    return newNotifications;
                });

                // Show notification dropdown briefly for new notifications
                if (notification.type === 'countdown' || notification.type === 'lottery') {
                    setShowNotifications(true);
                    setTimeout(() => setShowNotifications(false), 4000);
                }
            });

            // Cleanup subscription on unmount or logout
            return () => {
                console.log('🔔 Navbar unsubscribing from notifications');
                unsubscribe();
            };
        }
    }, [isLoggedIn]);

    const checkAuthStatus = () => {
        const storedUserData = localStorage.getItem('userData');
        if (storedUserData) {
            try {
                const user = JSON.parse(storedUserData);
                setIsLoggedIn(true);
                setUserData(user);
            } catch (error) {
                console.error('Error parsing user data:', error);
                setIsLoggedIn(false);
                setUserData(null);
                localStorage.removeItem('userData');
                localStorage.removeItem('authToken');
            }
        } else {
            setIsLoggedIn(false);
            setUserData(null);
            // Clear notifications when logged out
            setNotifications([]);
        }
    };

    const handleSignOut = () => {
        if (window.confirm('Are you sure you want to sign out?')) {
            // Clear all stored data
            localStorage.removeItem('userData');
            localStorage.removeItem('authToken');
            localStorage.removeItem('userSubmissions');
            localStorage.removeItem('currentWinner');

            // Update state
            setIsLoggedIn(false);
            setUserData(null);
            setShowUserMenu(false);
            setNotifications([]); // Clear notifications
            setShowNotifications(false);

            // Show confirmation
            alert('👋 You have been signed out successfully!');

            // Navigate to home
            navigate('/');
        }
    };

    const toggleUserMenu = () => {
        setShowUserMenu(!showUserMenu);
    };

    // 🚀 NEW: Notification functions
    const toggleNotifications = () => {
        setShowNotifications(!showNotifications);
    };

    const clearNotifications = () => {
        setNotifications([]);
        setShowNotifications(false);
    };

    const markNotificationAsRead = (index) => {
        setNotifications(prev =>
            prev.map((n, i) =>
                i === index ? { ...n, read: true } : n
            )
        );
    };

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'countdown':
                return '⏰';
            case 'lottery':
                return '🎰';
            case 'winner':
                return '🏆';
            case 'upload':
                return '📸';
            default:
                return '🔔';
        }
    };

    const formatNotificationTime = (timestamp) => {
        const now = new Date();
        const notificationTime = new Date(timestamp);
        const diffInMinutes = Math.floor((now - notificationTime) / (1000 * 60));

        if (diffInMinutes < 1) return 'Just now';
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
        if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
        return notificationTime.toLocaleDateString();
    };

    // Close menus when clicking outside
    useEffect(() => {
        const handleClickOutside = () => {
            setShowUserMenu(false);
            setShowNotifications(false);
        };

        if (showUserMenu || showNotifications) {
            document.addEventListener('click', handleClickOutside);
        }

        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, [showUserMenu, showNotifications]);

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <nav className="navbar">
            <div className="nav-container">
                {/* Logo */}
                <Link to="/" className="nav-logo">
                    <span className="logo-icon">🎰</span>
                    <span className="logo-text">Photo Lottery</span>
                </Link>

                {/* Navigation Links */}
                <div className="nav-links">
                    <Link
                        to="/"
                        className={`nav-link ${location.pathname === '/' || location.pathname === '/lottery' ? 'active' : ''}`}
                    >
                        🌍 Lottery
                    </Link>

                    {isLoggedIn ? (
                        <>
                            {/* User greeting */}
                            <div className="user-greeting">
                                👋 Hey, {userData?.name?.split(' ')[0] || 'User'}!
                            </div>

                            <Link
                                to="/dashboard"
                                className={`nav-link ${location.pathname === '/dashboard' ? 'active' : ''}`}
                            >
                                📸 Dashboard
                            </Link>

                            {/* 🚀 NEW: Notification Bell */}
                            <div className="notification-container">
                                <button
                                    className={`notification-bell ${unreadCount > 0 ? 'has-notifications' : ''}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleNotifications();
                                    }}
                                    title="Lottery Notifications"
                                >
                                    🔔
                                    {unreadCount > 0 && (
                                        <span className="notification-badge">{unreadCount}</span>
                                    )}
                                </button>

                                {/* Notification Dropdown */}
                                {showNotifications && (
                                    <div className="notification-dropdown">
                                        <div className="notification-header">
                                            <h4>🔔 Lottery Alerts</h4>
                                            {notifications.length > 0 && (
                                                <button
                                                    className="clear-notifications"
                                                    onClick={clearNotifications}
                                                >
                                                    Clear All
                                                </button>
                                            )}
                                        </div>

                                        <div className="notification-list">
                                            {notifications.length === 0 ? (
                                                <div className="no-notifications">
                                                    <p>No lottery alerts yet</p>
                                                    <small>You'll receive countdown & winner notifications here</small>
                                                </div>
                                            ) : (
                                                notifications.map((notification, index) => (
                                                    <div
                                                        key={index}
                                                        className={`notification-item ${!notification.read ? 'unread' : ''} ${notification.urgent ? 'urgent' : ''}`}
                                                        onClick={() => markNotificationAsRead(index)}
                                                    >
                                                        <div className="notification-content">
                                                            <div className="notification-icon">
                                                                {getNotificationIcon(notification.type)}
                                                            </div>
                                                            <div className="notification-text">
                                                                <div className="notification-title">
                                                                    {notification.title}
                                                                </div>
                                                                <div className="notification-message">
                                                                    {notification.message}
                                                                </div>
                                                                <div className="notification-time">
                                                                    {formatNotificationTime(notification.timestamp)}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* User Menu */}
                            <div className="user-menu-container">
                                <button
                                    className="user-menu-button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleUserMenu();
                                    }}
                                >
                                    <span className="user-avatar">
                                        {userData?.name?.charAt(0).toUpperCase() || '👤'}
                                    </span>
                                    <span className="dropdown-arrow">▼</span>
                                </button>

                                {showUserMenu && (
                                    <div className="user-dropdown">
                                        <div className="user-info">
                                            <strong>{userData?.name}</strong>
                                            <small>{userData?.email}</small>
                                            <small>🌍 {userData?.country}</small>
                                            {userData?.id && <small>🆔 ID: {userData.id}</small>}
                                        </div>
                                        <hr className="dropdown-divider" />
                                        <Link
                                            to="/dashboard"
                                            className="dropdown-link"
                                            onClick={() => setShowUserMenu(false)}
                                        >
                                            📸 My Dashboard
                                        </Link>
                                        <button
                                            className="dropdown-button logout-btn"
                                            onClick={handleSignOut}
                                        >
                                            🚪 Sign Out
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="auth-buttons">
                            <Link
                                to="/signin"
                                className={`nav-link signin-btn ${location.pathname === '/signin' ? 'active' : ''}`}
                            >
                                🔐 Sign In
                            </Link>
                            <Link
                                to="/register"
                                className={`nav-link register-btn ${location.pathname === '/register' ? 'active' : ''}`}
                            >
                                🚀 Join Now
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}

export default Navbar;