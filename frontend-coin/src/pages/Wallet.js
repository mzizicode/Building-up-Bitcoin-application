// src/pages/Wallet.js - Wallet Dashboard Component
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Wallet.css';

function Wallet() {
    const navigate = useNavigate();
    const [walletBalance, setWalletBalance] = useState(0);
    const [transactions, setTransactions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [userData, setUserData] = useState(null);

    useEffect(() => {
        // Check if user is logged in
        const userDataStr = localStorage.getItem('userData');
        const authToken = localStorage.getItem('authToken');

        if (!userDataStr || !authToken) {
            navigate('/signin');
            return;
        }

        setUserData(JSON.parse(userDataStr));
        loadWalletData();
    }, [navigate]);

    const loadWalletData = async () => {
        try {
            setIsLoading(true);

            // Try to load from backend first
            const response = await fetch('http://localhost:8080/api/wallet/balance', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            }).catch(() => null);

            if (response && response.ok) {
                const data = await response.json();
                if (data.success) {
                    setWalletBalance(data.wallet?.balance || 0);
                    // Load transactions if available
                    loadTransactions();
                    return;
                }
            }

            // Fallback to localStorage
            const savedBalance = localStorage.getItem('walletBalance');
            setWalletBalance(savedBalance ? parseInt(savedBalance) : 125);

            // Demo transactions
            const demoTransactions = [
                {
                    id: 1,
                    type: 'EARNED',
                    amount: 25,
                    description: 'Photo upload reward',
                    date: new Date().toLocaleDateString(),
                    status: 'COMPLETED'
                },
                {
                    id: 2,
                    type: 'EARNED',
                    amount: 10,
                    description: 'Daily login bonus',
                    date: new Date(Date.now() - 86400000).toLocaleDateString(),
                    status: 'COMPLETED'
                },
                {
                    id: 3,
                    type: 'SPENT',
                    amount: -50,
                    description: 'Marketplace purchase',
                    date: new Date(Date.now() - 172800000).toLocaleDateString(),
                    status: 'COMPLETED'
                }
            ];
            setTransactions(demoTransactions);

        } catch (error) {
            console.error('Failed to load wallet data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadTransactions = async () => {
        try {
            const response = await fetch('http://localhost:8080/api/wallet/transactions', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            }).catch(() => null);

            if (response && response.ok) {
                const data = await response.json();
                if (data.success) {
                    setTransactions(data.transactions || []);
                }
            }
        } catch (error) {
            console.error('Failed to load transactions:', error);
        }
    };

    const getTransactionIcon = (type) => {
        switch (type) {
            case 'EARNED': return '💰';
            case 'SPENT': return '🛒';
            case 'BONUS': return '🎁';
            case 'LOTTERY': return '🎰';
            default: return '💳';
        }
    };

    const getTransactionColor = (type) => {
        switch (type) {
            case 'EARNED': return '#10b981';
            case 'BONUS': return '#f59e0b';
            case 'LOTTERY': return '#8b5cf6';
            case 'SPENT': return '#ef4444';
            default: return '#6b7280';
        }
    };

    if (isLoading) {
        return (
            <div className="wallet-container">
                <div className="loading-section">
                    <div className="loading-spinner"></div>
                    <p>Loading wallet...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="wallet-container">
            {/* Header */}
            <div className="wallet-header">
                <div className="header-content">
                    <h1>💳 My Wallet</h1>
                    <p>Manage your coins and view transaction history</p>
                </div>

                <button
                    className="back-btn"
                    onClick={() => navigate('/dashboard')}
                >
                    ← Back to Dashboard
                </button>
            </div>

            {/* Balance Card */}
            <div className="balance-card">
                <div className="balance-content">
                    <h2>Current Balance</h2>
                    <div className="balance-amount">
                        💰 {walletBalance} <span className="currency">coins</span>
                    </div>
                    <p className="balance-subtitle">
                        Earned through photo uploads and lottery wins
                    </p>
                </div>

                <div className="balance-actions">
                    <button
                        className="earn-btn"
                        onClick={() => navigate('/dashboard')}
                    >
                        📸 Upload Photos to Earn
                    </button>
                    <button
                        className="spend-btn"
                        onClick={() => navigate('/marketplace')}
                    >
                        🛒 Visit Marketplace
                    </button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="quick-stats">
                <div className="stat-card">
                    <div className="stat-icon">📈</div>
                    <div className="stat-info">
                        <h3>Total Earned</h3>
                        <p>{walletBalance + 50} coins</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">🛒</div>
                    <div className="stat-info">
                        <h3>Total Spent</h3>
                        <p>50 coins</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">🎯</div>
                    <div className="stat-info">
                        <h3>This Month</h3>
                        <p>+35 coins</p>
                    </div>
                </div>
            </div>

            {/* How to Earn */}
            <div className="earn-methods">
                <h3>💡 How to Earn More Coins</h3>
                <div className="earn-grid">
                    <div className="earn-method">
                        <span className="earn-icon">📸</span>
                        <h4>Upload Photos</h4>
                        <p>Earn 25 coins for each photo uploaded to the lottery</p>
                    </div>
                    <div className="earn-method">
                        <span className="earn-icon">🏆</span>
                        <h4>Win Lottery</h4>
                        <p>Bonus coins when your photo wins the 24-hour lottery</p>
                    </div>
                    <div className="earn-method">
                        <span className="earn-icon">🔄</span>
                        <h4>Daily Login</h4>
                        <p>Get 10 coins just for visiting the site each day</p>
                    </div>
                    <div className="earn-method">
                        <span className="earn-icon">👥</span>
                        <h4>Refer Friends</h4>
                        <p>Earn 50 coins when friends join using your referral</p>
                    </div>
                </div>
            </div>

            {/* Recent Transactions */}
            <div className="transactions-section">
                <div className="section-header">
                    <h3>📋 Recent Transactions</h3>
                    <p>{transactions.length} transactions</p>
                </div>

                {transactions.length === 0 ? (
                    <div className="empty-transactions">
                        <span className="empty-icon">💳</span>
                        <h4>No transactions yet</h4>
                        <p>Start uploading photos to earn your first coins!</p>
                        <button
                            className="start-earning-btn"
                            onClick={() => navigate('/dashboard')}
                        >
                            Start Earning
                        </button>
                    </div>
                ) : (
                    <div className="transactions-list">
                        {transactions.map(transaction => (
                            <div key={transaction.id} className="transaction-item">
                                <div className="transaction-icon">
                                    {getTransactionIcon(transaction.type)}
                                </div>
                                <div className="transaction-details">
                                    <h4>{transaction.description}</h4>
                                    <p className="transaction-date">{transaction.date}</p>
                                </div>
                                <div
                                    className="transaction-amount"
                                    style={{ color: getTransactionColor(transaction.type) }}
                                >
                                    {transaction.amount > 0 ? '+' : ''}{transaction.amount} coins
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Marketplace Preview */}
            <div className="marketplace-preview">
                <h3>🛍️ Spend Your Coins</h3>
                <p>Check out what you can buy in the marketplace</p>
                <button
                    className="marketplace-btn"
                    onClick={() => navigate('/marketplace')}
                >
                    Browse Marketplace →
                </button>
            </div>
        </div>
    );
}

export default Wallet;