// src/pages/WalletDashboard.js - Comprehensive Wallet Management
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './WalletDashboard.css';

function WalletDashboard() {
    const navigate = useNavigate();
    const [walletData, setWalletData] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [showTopUpModal, setShowTopUpModal] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [topUpAmount, setTopUpAmount] = useState('');
    const [transferAmount, setTransferAmount] = useState('');
    const [transferEmail, setTransferEmail] = useState('');

    useEffect(() => {
        loadWalletData();
        loadTransactionHistory();
    }, []);

    const loadWalletData = async () => {
        try {
            const response = await fetch('http://localhost:8080/api/wallet/balance', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error('Failed to load wallet data');

            const data = await response.json();
            if (data.success) {
                setWalletData(data.wallet);
            }
        } catch (err) {
            setError('Failed to load wallet data');
            console.error(err);
        }
    };

    const loadTransactionHistory = async () => {
        try {
            const response = await fetch('http://localhost:8080/api/wallet/transactions?page=0&size=20', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error('Failed to load transactions');

            const data = await response.json();
            if (data.success) {
                setTransactions(data.transactions);
            }
        } catch (err) {
            console.error('Failed to load transaction history:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleTopUp = async (e) => {
        e.preventDefault();
        if (!topUpAmount || parseFloat(topUpAmount) <= 0) {
            alert('Please enter a valid amount');
            return;
        }

        try {
            const response = await fetch('http://localhost:8080/api/wallet/top-up', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    amount: parseFloat(topUpAmount),
                    paymentMethod: 'card',
                    transactionId: 'demo-' + Date.now()
                })
            });

            if (!response.ok) throw new Error('Top-up failed');

            const data = await response.json();
            if (data.success) {
                alert('✅ Top-up successful!');
                setShowTopUpModal(false);
                setTopUpAmount('');
                loadWalletData();
                loadTransactionHistory();
            }
        } catch (err) {
            alert('Top-up failed: ' + err.message);
        }
    };

    const handleTransfer = async (e) => {
        e.preventDefault();
        if (!transferAmount || !transferEmail || parseFloat(transferAmount) <= 0) {
            alert('Please fill in all fields with valid values');
            return;
        }

        try {
            const response = await fetch('http://localhost:8080/api/wallet/transfer', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    toUserEmail: transferEmail,
                    amount: parseFloat(transferAmount),
                    description: 'User transfer'
                })
            });

            if (!response.ok) throw new Error('Transfer failed');

            const data = await response.json();
            if (data.success) {
                alert('✅ Transfer successful!');
                setShowTransferModal(false);
                setTransferAmount('');
                setTransferEmail('');
                loadWalletData();
                loadTransactionHistory();
            }
        } catch (err) {
            alert('Transfer failed: ' + err.message);
        }
    };

    const getTransactionIcon = (type, category) => {
        if (type === 'EARN') return '💰';
        if (type === 'SPEND') return '🛒';
        if (type === 'TRANSFER') return '💸';
        if (type === 'REFUND') return '↩️';
        if (type === 'TOP_UP') return '💳';
        if (type === 'ESCROW_HOLD') return '🔒';
        if (type === 'ESCROW_RELEASE') return '🔓';
        return '💫';
    };

    const getTransactionColor = (type) => {
        if (type === 'EARN' || type === 'REFUND' || type === 'TOP_UP' || type === 'ESCROW_RELEASE') return '#10b981';
        if (type === 'SPEND' || type === 'TRANSFER' || type === 'ESCROW_HOLD') return '#ef4444';
        return '#6b7280';
    };

    const formatAmount = (amount, type) => {
        const sign = (type === 'EARN' || type === 'REFUND' || type === 'TOP_UP' || type === 'ESCROW_RELEASE') ? '+' : '-';
        return `${sign}${amount}`;
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (isLoading) {
        return (
            <div className="wallet-loading">
                <div className="loading-spinner"></div>
                <p>Loading your wallet...</p>
            </div>
        );
    }

    return (
        <div className="wallet-dashboard">
            {/* Header */}
            <div className="wallet-header">
                <h1>💰 My Wallet</h1>
                <p>Manage your coins and transactions</p>
            </div>

            {/* Wallet Cards */}
            <div className="wallet-cards">
                <div className="balance-card main-balance">
                    <div className="card-icon">🪙</div>
                    <div className="card-info">
                        <h3>Available Balance</h3>
                        <p className="balance-amount">{walletData?.availableBalance || '0'} Coins</p>
                        <small>Ready to spend</small>
                    </div>
                </div>

                <div className="balance-card pending-balance">
                    <div className="card-icon">⏳</div>
                    <div className="card-info">
                        <h3>Pending Balance</h3>
                        <p className="balance-amount">{walletData?.pendingBalance || '0'} Coins</p>
                        <small>In escrow/pending</small>
                    </div>
                </div>

                <div className="balance-card total-earned">
                    <div className="card-icon">📈</div>
                    <div className="card-info">
                        <h3>Total Earned</h3>
                        <p className="balance-amount">{walletData?.totalEarned || '0'} Coins</p>
                        <small>All time earnings</small>
                    </div>
                </div>

                <div className="balance-card total-spent">
                    <div className="card-icon">🛍️</div>
                    <div className="card-info">
                        <h3>Total Spent</h3>
                        <p className="balance-amount">{walletData?.totalSpent || '0'} Coins</p>
                        <small>All time spending</small>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="wallet-actions">
                <h2>Quick Actions</h2>
                <div className="action-buttons">
                    <button
                        className="action-btn top-up"
                        onClick={() => setShowTopUpModal(true)}
                    >
                        <span className="btn-icon">💳</span>
                        <span>Top Up Coins</span>
                    </button>

                    <button
                        className="action-btn transfer"
                        onClick={() => setShowTransferModal(true)}
                    >
                        <span className="btn-icon">💸</span>
                        <span>Send Coins</span>
                    </button>

                    <button
                        className="action-btn marketplace"
                        onClick={() => navigate('/marketplace')}
                    >
                        <span className="btn-icon">🛒</span>
                        <span>Visit Marketplace</span>
                    </button>

                    <button
                        className="action-btn rewards"
                        onClick={() => navigate('/rewards')}
                    >
                        <span className="btn-icon">🎁</span>
                        <span>Earn Rewards</span>
                    </button>
                </div>
            </div>

            {/* Transaction History */}
            <div className="transaction-history">
                <div className="history-header">
                    <h2>Recent Transactions</h2>
                    <button className="view-all-btn">View All</button>
                </div>

                {transactions.length === 0 ? (
                    <div className="no-transactions">
                        <span className="empty-icon">📋</span>
                        <p>No transactions yet</p>
                        <small>Your transaction history will appear here</small>
                    </div>
                ) : (
                    <div className="transactions-list">
                        {transactions.map((transaction) => (
                            <div key={transaction.id} className="transaction-item">
                                <div className="transaction-icon">
                                    {getTransactionIcon(transaction.type, transaction.category)}
                                </div>
                                <div className="transaction-details">
                                    <h4>{transaction.description || transaction.category}</h4>
                                    <p className="transaction-meta">
                                        {formatDate(transaction.createdAt)} • {transaction.type}
                                    </p>
                                    {transaction.referenceId && (
                                        <small className="reference-id">Ref: {transaction.referenceId}</small>
                                    )}
                                </div>
                                <div
                                    className="transaction-amount"
                                    style={{ color: getTransactionColor(transaction.type) }}
                                >
                                    {formatAmount(transaction.amount, transaction.type)} coins
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Earning Opportunities */}
            <div className="earning-opportunities">
                <h2>💫 Ways to Earn Coins</h2>
                <div className="earning-cards">
                    <div className="earning-card">
                        <span className="earning-icon">📸</span>
                        <h3>Upload Photos</h3>
                        <p>+25 coins per photo</p>
                        <button onClick={() => navigate('/dashboard')}>Upload Now</button>
                    </div>

                    <div className="earning-card">
                        <span className="earning-icon">🎯</span>
                        <h3>Daily Login</h3>
                        <p>+10 coins daily</p>
                        <button onClick={() => window.location.reload()}>Check In</button>
                    </div>

                    <div className="earning-card">
                        <span className="earning-icon">🤝</span>
                        <h3>Refer Friends</h3>
                        <p>+50 coins per referral</p>
                        <button onClick={() => navigate('/referrals')}>Invite</button>
                    </div>

                    <div className="earning-card">
                        <span className="earning-icon">🏪</span>
                        <h3>Sell Items</h3>
                        <p>Earn from sales</p>
                        <button onClick={() => navigate('/marketplace/sell')}>Start Selling</button>
                    </div>
                </div>
            </div>

            {/* Top-up Modal */}
            {showTopUpModal && (
                <div className="modal-overlay" onClick={() => setShowTopUpModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>💳 Top Up Coins</h3>
                            <button
                                className="close-btn"
                                onClick={() => setShowTopUpModal(false)}
                            >×</button>
                        </div>

                        <form onSubmit={handleTopUp}>
                            <div className="form-group">
                                <label>Amount (coins)</label>
                                <input
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={topUpAmount}
                                    onChange={(e) => setTopUpAmount(e.target.value)}
                                    placeholder="Enter amount"
                                    className="form-input"
                                />
                            </div>

                            <div className="quick-amounts">
                                <button
                                    type="button"
                                    onClick={() => setTopUpAmount('100')}
                                    className="quick-btn"
                                >100 coins - $1.00</button>
                                <button
                                    type="button"
                                    onClick={() => setTopUpAmount('500')}
                                    className="quick-btn"
                                >500 coins - $4.50</button>
                                <button
                                    type="button"
                                    onClick={() => setTopUpAmount('1000')}
                                    className="quick-btn"
                                >1000 coins - $8.00</button>
                            </div>

                            <div className="form-actions">
                                <button type="submit" className="submit-btn">
                                    Purchase Coins
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Transfer Modal */}
            {showTransferModal && (
                <div className="modal-overlay" onClick={() => setShowTransferModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>💸 Send Coins</h3>
                            <button
                                className="close-btn"
                                onClick={() => setShowTransferModal(false)}
                            >×</button>
                        </div>

                        <form onSubmit={handleTransfer}>
                            <div className="form-group">
                                <label>Recipient Email</label>
                                <input
                                    type="email"
                                    value={transferEmail}
                                    onChange={(e) => setTransferEmail(e.target.value)}
                                    placeholder="user@example.com"
                                    className="form-input"
                                />
                            </div>

                            <div className="form-group">
                                <label>Amount (coins)</label>
                                <input
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={transferAmount}
                                    onChange={(e) => setTransferAmount(e.target.value)}
                                    placeholder="Enter amount"
                                    className="form-input"
                                />
                                <small>Available: {walletData?.availableBalance || 0} coins</small>
                            </div>

                            <div className="form-actions">
                                <button type="submit" className="submit-btn">
                                    Send Coins
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {error && (
                <div className="error-message">
                    ⚠️ {error}
                </div>
            )}
        </div>
    );
}

export default WalletDashboard;