// src/components/NotificationTest.js - Test component to verify notifications work
import React, { useEffect, useState } from 'react';
import notificationService from '../services/NotificationService';

function NotificationTest() {
    const [notifications, setNotifications] = useState([]);

    useEffect(() => {
        console.log('🧪 NotificationTest component mounting...');

        // Subscribe to notifications
        const unsubscribe = notificationService.subscribe((notification) => {
            console.log('🧪 Test component received notification:', notification);
            setNotifications(prev => [notification, ...prev].slice(0, 5)); // Keep last 5
        });

        // Cleanup
        return () => {
            console.log('🧪 NotificationTest component unmounting...');
            unsubscribe();
        };
    }, []);

    const testCountdown = () => {
        console.log('🧪 Testing countdown notification...');
        notificationService.triggerCountdown(60);
    };

    const testLottery = () => {
        console.log('🧪 Testing lottery notification...');
        notificationService.triggerLotteryDraw(25);
    };

    const testWinner = () => {
        console.log('🧪 Testing winner notification...');
        notificationService.triggerWinner({
            description: "Beautiful sunset over the mountains",
            user: "TestUser",
            id: "test-123"
        });
    };

    const testUpload = () => {
        console.log('🧪 Testing upload notification...');
        notificationService.triggerUpload("Amazing landscape photo");
    };

    return (
        <div style={{
            position: 'fixed',
            top: '10px',
            right: '10px',
            background: 'rgba(0,0,0,0.9)',
            color: 'white',
            padding: '20px',
            borderRadius: '10px',
            zIndex: 9999,
            minWidth: '300px'
        }}>
            <h3>🧪 Notification Test Panel</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                <button onClick={testCountdown} style={{ padding: '8px', borderRadius: '5px' }}>
                    ⏰ Test Countdown
                </button>
                <button onClick={testLottery} style={{ padding: '8px', borderRadius: '5px' }}>
                    🎰 Test Lottery Draw
                </button>
                <button onClick={testWinner} style={{ padding: '8px', borderRadius: '5px' }}>
                    🏆 Test Winner
                </button>
                <button onClick={testUpload} style={{ padding: '8px', borderRadius: '5px' }}>
                    📸 Test Upload
                </button>
                <button
                    onClick={() => notificationService.triggerTest()}
                    style={{ padding: '8px', borderRadius: '5px', background: '#4CAF50' }}
                >
                    🧪 Test Generic
                </button>
            </div>

            <h4>Recent Notifications ({notifications.length}):</h4>
            <div style={{ maxHeight: '200px', overflow: 'auto' }}>
                {notifications.length === 0 ? (
                    <p style={{ color: '#888' }}>No notifications yet...</p>
                ) : (
                    notifications.map((notif, index) => (
                        <div
                            key={index}
                            style={{
                                background: 'rgba(255,255,255,0.1)',
                                padding: '8px',
                                marginBottom: '8px',
                                borderRadius: '5px',
                                fontSize: '12px'
                            }}
                        >
                            <strong>{notif.title}</strong>
                            <br />
                            <span>{notif.message}</span>
                            <br />
                            <small style={{ color: '#ccc' }}>
                                {new Date(notif.timestamp).toLocaleTimeString()}
                            </small>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default NotificationTest;