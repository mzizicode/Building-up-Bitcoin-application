/**
 * MyWalletDashboard.js
 * Professional Wallet Management Dashboard for JoyTrade
 * Features: Wallet creation, USDT/BNB transactions, Escrow management, Transaction history
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUSDTBalance, sendUSDT, getBNBBalance, sendBNB } from '../untils/blockchain';
import { Wallet, ethers } from 'ethers';
import './WalletDashboard.css';
import { QRCodeCanvas } from 'qrcode.react';
import UsdtPanel from "../components/UsdtPanel";
import BSC_MAINNET from "../configurations/chain";
import { createDeal, getEscrowContract } from "../untils/escrow";
import { approveUSDT } from "../untils/erc20";

// ============================================================================
// CONSTANTS
// ============================================================================

const TRANSACTION_TYPES = {
    SEND: 'send',
    RECEIVE: 'receive',
};

const CRYPTO_TYPES = {
    USDT: 'usdt',
    BNB: 'bnb',
};

const ESCROW_CONFIG = {
    feeBps: 150, // 1.5%
    expiresAt: 0,
    metadata: ethers.keccak256(ethers.toUtf8Bytes("demo-order-1")),
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate a new random wallet with address, private key, and mnemonic
 * @returns {Object} Wallet object with address, privateKey, and mnemonic
 */
function createNewWallet() {
    const wallet = Wallet.createRandom();
    return {
        address: wallet.address,
        privateKey: wallet.privateKey,
        mnemonic: wallet.mnemonic.phrase,
    };
}

/**
 * Mask sensitive wallet data for display
 * @param {string} data - The data to mask
 * @param {number} visibleChars - Number of characters to show from start and end
 * @returns {string} Masked data string
 */
function maskSensitiveData(data, visibleChars = 6) {
    if (!data || data.length <= visibleChars * 2) return data;
    const start = data.substring(0, visibleChars);
    const end = data.substring(data.length - visibleChars);
    return `${start}${'•'.repeat(data.length - visibleChars * 2)}${end}`;
}

/**
 * Copy text to clipboard with user feedback
 * @param {string} text - Text to copy
 * @param {string} label - Label for success message
 */
function copyToClipboard(text, label = 'Copied') {
    navigator.clipboard.writeText(text).then(() => {
        alert(`${label} to clipboard!`);
    });
}

/**
 * Format address for display (shortened version)
 * @param {string} address - Ethereum address
 * @returns {string} Formatted address
 */
function formatAddress(address) {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

// ============================================================================
// ESCROW DEV PANEL COMPONENT
// ============================================================================

/**
 * EscrowDevPanel Component
 * Manages escrow deal creation, approval, funding, and settlement
 */
function EscrowDevPanel() {
    const [seller, setSeller] = useState("");
    const [amount, setAmount] = useState("1");
    const [dealId, setDealId] = useState("");
    const [status, setStatus] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleCreateDeal = async () => {
        if (!seller || !amount) {
            setStatus("Please fill in seller address and amount");
            return;
        }

        try {
            setIsLoading(true);
            setStatus("Creating deal...");
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const buyer = await signer.getAddress();

            const amountWei = ethers.parseUnits(amount, 18);

            await createDeal(
                buyer,
                seller,
                BSC_MAINNET.usdtAddress,
                amountWei,
                ESCROW_CONFIG.expiresAt,
                ESCROW_CONFIG.feeBps,
                ESCROW_CONFIG.metadata
            );

            setStatus("✅ Deal created. Now approve & fund.");
            setDealId("1");
        } catch (e) {
            setStatus(`❌ Create failed: ${e?.shortMessage || e?.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleApprove = async () => {
        if (!amount) {
            setStatus("Please enter an amount");
            return;
        }

        try {
            setIsLoading(true);
            setStatus("Approving USDT...");
            const amountWei = ethers.parseUnits(amount, 18);
            await approveUSDT(BSC_MAINNET.escrowAddress, amountWei);
            setStatus("✅ Approved. Now click Fund.");
        } catch (e) {
            setStatus(`❌ Approve failed: ${e?.shortMessage || e?.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFund = async () => {
        if (!dealId) {
            setStatus("Please enter deal ID");
            return;
        }

        try {
            setIsLoading(true);
            setStatus("Funding escrow...");
            const escrow = await getEscrowContract();
            const tx = await escrow.fund(Number(dealId));
            await tx.wait();
            setStatus("✅ Funded! Buyer can now Release or Refund.");
        } catch (e) {
            setStatus(`❌ Fund failed: ${e?.shortMessage || e?.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRelease = async () => {
        if (!dealId) {
            setStatus("Please enter deal ID");
            return;
        }

        try {
            setIsLoading(true);
            setStatus("Releasing to seller...");
            const escrow = await getEscrowContract();
            const tx = await escrow.release(Number(dealId));
            await tx.wait();
            setStatus("🎉 Released to seller!");
        } catch (e) {
            setStatus(`❌ Release failed: ${e?.shortMessage || e?.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRefund = async () => {
        if (!dealId) {
            setStatus("Please enter deal ID");
            return;
        }

        try {
            setIsLoading(true);
            setStatus("Refunding to buyer...");
            const escrow = await getEscrowContract();
            const tx = await escrow.refund(Number(dealId));
            await tx.wait();
            setStatus("🔁 Refunded to buyer!");
        } catch (e) {
            setStatus(`❌ Refund failed: ${e?.shortMessage || e?.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="escrow-dev-panel">
            <h3 className="escrow-title">Escrow Development Panel</h3>
            <div className="escrow-form-grid">
                <div className="form-group">
                    <label>Seller Address</label>
                    <input
                        type="text"
                        placeholder="0x..."
                        value={seller}
                        onChange={(e) => setSeller(e.target.value)}
                        disabled={isLoading}
                    />
                </div>

                <div className="form-group">
                    <label>Amount (USDT)</label>
                    <input
                        type="number"
                        placeholder="e.g., 1"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        disabled={isLoading}
                    />
                </div>

                <div className="form-group">
                    <label>Deal ID</label>
                    <input
                        type="text"
                        placeholder="Default 1"
                        value={dealId}
                        onChange={(e) => setDealId(e.target.value)}
                        disabled={isLoading}
                    />
                </div>

                <div className="escrow-buttons">
                    <button
                        onClick={handleCreateDeal}
                        disabled={isLoading}
                        className="escrow-btn create"
                        title="Step 1: Create a new escrow deal"
                    >
                        Create Deal
                    </button>
                    <button
                        onClick={handleApprove}
                        disabled={isLoading}
                        className="escrow-btn approve"
                        title="Step 2: Approve USDT spending"
                    >
                        Approve USDT
                    </button>
                    <button
                        onClick={handleFund}
                        disabled={isLoading}
                        className="escrow-btn fund"
                        title="Step 3: Fund the escrow"
                    >
                        Fund
                    </button>
                    <button
                        onClick={handleRelease}
                        disabled={isLoading}
                        className="escrow-btn release"
                        title="Release funds to seller"
                    >
                        Release
                    </button>
                    <button
                        onClick={handleRefund}
                        disabled={isLoading}
                        className="escrow-btn refund"
                        title="Refund funds to buyer"
                    >
                        Refund
                    </button>
                </div>

                {status && <div className={`escrow-status ${status.includes('❌') ? 'error' : 'success'}`}>{status}</div>}
            </div>
        </div>
    );
}

// ============================================================================
// WALLET INFORMATION DISPLAY COMPONENT
// ============================================================================

/**
 * WalletInfoDisplay Component
 * Shows wallet details with show/hide toggle for sensitive data
 */
function WalletInfoDisplay({ wallet }) {
    const [showPrivateKey, setShowPrivateKey] = useState(false);
    const [showMnemonic, setShowMnemonic] = useState(false);

    if (!wallet) return null;

    return (
        <div className="wallet-info-container">
            <div className="wallet-info-header">
                <h2>Wallet Information</h2>
                <p className="wallet-info-subtitle">Your wallet credentials - keep them secure</p>
            </div>

            {/* Address */}
            <div className="wallet-info-item">
                <div className="info-item-header">
                    <label className="info-label">Wallet Address</label>
                    <button
                        className="copy-btn"
                        onClick={() => copyToClipboard(wallet.address, 'Address copied')}
                        title="Copy to clipboard"
                    >
                        📋 Copy
                    </button>
                </div>
                <div className="info-value address-value">
                    <code>{wallet.address}</code>
                </div>
            </div>

            {/* Private Key */}
            <div className="wallet-info-item">
                <div className="info-item-header">
                    <label className="info-label">Private Key</label>
                    <div className="info-controls">
                        <button
                            className="toggle-btn"
                            onClick={() => setShowPrivateKey(!showPrivateKey)}
                            title={showPrivateKey ? 'Hide' : 'Show'}
                        >
                            {showPrivateKey ? '👁️ Hide' : '👁️ Show'}
                        </button>
                        <button
                            className="copy-btn"
                            onClick={() => copyToClipboard(wallet.privateKey, 'Private Key copied')}
                            title="Copy to clipboard"
                            disabled={!showPrivateKey}
                        >
                            📋 Copy
                        </button>
                    </div>
                </div>
                <div className="info-value private-key-value">
                    <code>{showPrivateKey ? wallet.privateKey : maskSensitiveData(wallet.privateKey, 8)}</code>
                </div>
                {!showPrivateKey && <p className="security-note">⚠️ Click "Show" to reveal</p>}
            </div>

            {/* Mnemonic */}
            <div className="wallet-info-item">
                <div className="info-item-header">
                    <label className="info-label">Mnemonic Phrase</label>
                    <div className="info-controls">
                        <button
                            className="toggle-btn"
                            onClick={() => setShowMnemonic(!showMnemonic)}
                            title={showMnemonic ? 'Hide' : 'Show'}
                        >
                            {showMnemonic ? '👁️ Hide' : '👁️ Show'}
                        </button>
                        <button
                            className="copy-btn"
                            onClick={() => copyToClipboard(wallet.mnemonic, 'Mnemonic copied')}
                            title="Copy to clipboard"
                            disabled={!showMnemonic}
                        >
                            📋 Copy
                        </button>
                    </div>
                </div>
                <div className="info-value mnemonic-value">
                    <code>{showMnemonic ? wallet.mnemonic : maskSensitiveData(wallet.mnemonic, 10)}</code>
                </div>
                {!showMnemonic && <p className="security-note">⚠️ Click "Show" to reveal</p>}
            </div>

            <div className="security-warning">
                <strong>🔒 Security Notice:</strong> Never share your private key or mnemonic phrase with anyone. Keep them in a secure location.
            </div>
        </div>
    );
}

// ============================================================================
// SEND CRYPTO PANEL COMPONENT
// ============================================================================

/**
 * SendCryptoPanel Component
 * Handles sending USDT or BNB
 */
function SendCryptoPanel({ type, balance, wallet, onSend, isLoading, status }) {
    const [recipient, setRecipient] = useState('');
    const [amount, setAmount] = useState('');

    const isBNB = type === CRYPTO_TYPES.BNB;
    const cryptoSymbol = isBNB ? 'BNB' : 'USDT';

    const handleSubmit = () => {
        if (!recipient || !amount) {
            alert('Please fill in all fields');
            return;
        }
        onSend(recipient, amount);
        setRecipient('');
        setAmount('');
    };

    return (
        <div className={`send-crypto-panel send-${type}-panel`}>
            <h2 className="panel-title">Send {cryptoSymbol}</h2>

            <div className="form-group">
                <label htmlFor={`recipient-${type}`}>Recipient Address</label>
                <input
                    id={`recipient-${type}`}
                    type="text"
                    placeholder="0x..."
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    disabled={isLoading}
                />
            </div>

            <div className="form-group">
                <label htmlFor={`amount-${type}`}>
                    Amount ({cryptoSymbol})
                    {balance && <span className="balance-hint">Available: {balance}</span>}
                </label>
                <input
                    id={`amount-${type}`}
                    type="number"
                    placeholder={isBNB ? "e.g., 0.1" : "e.g., 1.5"}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={isLoading}
                    step="0.01"
                />
            </div>

            <button
                onClick={handleSubmit}
                disabled={isLoading || !recipient || !amount}
                className="send-btn"
            >
                {isLoading ? `Sending ${cryptoSymbol}...` : `Send ${cryptoSymbol}`}
            </button>

            {status && (
                <div className={`transaction-status ${status.includes('Failed') || status.includes('failed') ? 'error' : 'success'}`}>
                    {status}
                </div>
            )}
        </div>
    );
}

// ============================================================================
// RECEIVE CRYPTO PANEL COMPONENT
// ============================================================================

/**
 * ReceiveCryptoPanel Component
 * Shows QR code and wallet address for receiving crypto
 */
function ReceiveCryptoPanel({ type, wallet }) {
    const isBNB = type === CRYPTO_TYPES.BNB;
    const cryptoSymbol = isBNB ? 'BNB' : 'USDT';

    return (
        <div className={`receive-crypto-panel receive-${type}-panel`}>
            <h2 className="panel-title">Receive {cryptoSymbol}</h2>

            <div className="receive-content">
                <p className="receive-label">Your Wallet Address</p>
                <div className="address-display">
                    <code>{wallet.address}</code>
                    <button
                        className="copy-btn-sm"
                        onClick={() => copyToClipboard(wallet.address, `${cryptoSymbol} address copied`)}
                        title="Copy address"
                    >
                        📋
                    </button>
                </div>

                <div className="qr-code-container">
                    <QRCodeCanvas value={wallet.address} size={180} level="H" includeMargin />
                    <p className="qr-hint">Scan to receive {cryptoSymbol}</p>
                </div>

                <button
                    className="action-btn"
                    onClick={() => copyToClipboard(wallet.address, `${cryptoSymbol} address copied`)}
                >
                    📋 Copy Address
                </button>
            </div>
        </div>
    );
}

// ============================================================================
// TRANSACTION HISTORY COMPONENT
// ============================================================================

/**
 * TransactionHistory Component
 * Displays list of transactions with explorer links
 */
function TransactionHistory({ type, transactions }) {
    const isBNB = type === CRYPTO_TYPES.BNB;
    const cryptoSymbol = isBNB ? 'BNB' : 'USDT';

    if (transactions.length === 0) {
        return (
            <div className="transaction-history">
                <h3 className="history-title">{cryptoSymbol} Transaction History</h3>
                <div className="no-transactions">
                    <p>No {cryptoSymbol} transactions yet</p>
                </div>
            </div>
        );
    }

    return (
        <div className="transaction-history">
            <h3 className="history-title">{cryptoSymbol} Transaction History</h3>
            <div className="transactions-list">
                {transactions.map((tx, index) => (
                    <div key={index} className="transaction-item">
                        <div className="tx-icon" title={tx.type}>
                            {tx.type === TRANSACTION_TYPES.SEND ? '↑' : '↓'}
                        </div>

                        <div className="tx-details">
                            <h4 className="tx-action">
                                {tx.type === TRANSACTION_TYPES.SEND ? 'Sent' : 'Received'} {tx.amount} {cryptoSymbol}
                            </h4>
                            <p className="tx-meta">
                                {tx.type === TRANSACTION_TYPES.SEND ? `To: ${formatAddress(tx.to)}` : `From: ${formatAddress(tx.from)}`}
                            </p>
                            <p className="tx-time">{tx.timestamp}</p>
                            <p className="tx-hash">
                                Hash: <code>{tx.hash.slice(0, 16)}...</code>
                            </p>
                        </div>

                        <a
                            href={`https://bscscan.com/tx/${tx.hash}`}
                            target="_blank"
                            rel="noreferrer"
                            className="explorer-link"
                            title="View on BscScan"
                        >
                            🔗 View
                        </a>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ============================================================================
// MAIN WALLET DASHBOARD COMPONENT
// ============================================================================

/**
 * MyWalletDashboard Component
 * Main component managing wallet operations, balances, and transactions
 */
export default function MyWalletDashboard() {
    const navigate = useNavigate();

    // Wallet State
    const [wallet, setWallet] = useState(null);

    // USDT State
    const [usdtBalance, setUsdtBalance] = useState(null);
    const [usdtTransactions, setUsdtTransactions] = useState([]);
    const [isSendingUSDT, setIsSendingUSDT] = useState(false);
    const [usdtStatus, setUsdtStatus] = useState('');

    // BNB State
    const [bnbBalance, setBnbBalance] = useState(null);
    const [bnbTransactions, setBnbTransactions] = useState([]);
    const [isSendingBNB, setIsSendingBNB] = useState(false);
    const [bnbStatus, setBnbStatus] = useState('');

    // UI State
    const [selectedTab, setSelectedTab] = useState(CRYPTO_TYPES.USDT);
    const [error, setError] = useState('');

    // ========================================================================
    // INITIALIZATION
    // ========================================================================

    useEffect(() => {
        loadWalletFromStorage();
    }, []);

    const loadWalletFromStorage = () => {
        const storedAddress = localStorage.getItem('walletAddress');
        const storedKey = localStorage.getItem('walletPrivateKey');
        const storedMnemonic = localStorage.getItem('walletMnemonic');

        if (storedAddress && storedKey) {
            const loadedWallet = {
                address: storedAddress,
                privateKey: storedKey,
                mnemonic: storedMnemonic || '',
            };
            setWallet(loadedWallet);
            fetchBalances(storedAddress);
            fetchTransactions();
        }
    };

    // ========================================================================
    // BALANCE FETCHING
    // ========================================================================

    const fetchBalances = (address) => {
        fetchUSDTBalance(address);
        fetchBNBBalance(address);
    };

    const fetchUSDTBalance = async (address) => {
        try {
            const balance = await getUSDTBalance(address);
            setUsdtBalance(balance);
        } catch (err) {
            console.error('Error fetching USDT balance:', err);
        }
    };

    const fetchBNBBalance = async (address) => {
        try {
            const balance = await getBNBBalance(address);
            setBnbBalance(balance);
        } catch (err) {
            console.error('Error fetching BNB balance:', err);
        }
    };

    // ========================================================================
    // TRANSACTION FETCHING
    // ========================================================================

    const fetchTransactions = () => {
        fetchUSDTTransactions();
        fetchBNBTransactions();
    };

    const fetchUSDTTransactions = () => {
        // Mock transactions - Replace with actual API call
        const mockTransactions = [
            {
                type: TRANSACTION_TYPES.RECEIVE,
                from: '0x456def789abc123456def789abc123456def789a',
                amount: '25.0',
                hash: '0x4444555566667777888899990000111122223333',
                timestamp: new Date(Date.now() - 10800000).toLocaleString(),
            },
        ];
        setUsdtTransactions(mockTransactions);
    };

    const fetchBNBTransactions = () => {
        // Mock transactions - Replace with actual API call
        const mockTransactions = [
            {
                type: TRANSACTION_TYPES.SEND,
                to: '0xabc123def456789abc123def456789abc123def4',
                amount: '0.2',
                hash: '0x1111222233334444555566667777888899990000',
                timestamp: new Date(Date.now() - 3600000).toLocaleString(),
            },
        ];
        setBnbTransactions(mockTransactions);
    };

    // ========================================================================
    // WALLET CREATION
    // ========================================================================

    const handleCreateWallet = () => {
        const newWallet = createNewWallet();
        setWallet(newWallet);
        localStorage.setItem('walletAddress', newWallet.address);
        localStorage.setItem('walletPrivateKey', newWallet.privateKey);
        localStorage.setItem('walletMnemonic', newWallet.mnemonic);
        fetchBalances(newWallet.address);
        fetchTransactions();
    };

    // ========================================================================
    // SEND FUNCTIONS
    // ========================================================================

    const handleSendUSDT = async (recipient, amount) => {
        try {
            setIsSendingUSDT(true);
            setUsdtStatus('Sending USDT...');
            const receipt = await sendUSDT(wallet.privateKey, recipient, amount);
            console.log("USDT Receipt:", receipt);
            setUsdtStatus(`✅ Sent ${amount} USDT successfully!`);
            fetchUSDTBalance(wallet.address);
            fetchUSDTTransactions();
        } catch (e) {
            console.error("USDT send failed:", e);
            setUsdtStatus(`❌ Failed: ${e.message}`);
        } finally {
            setIsSendingUSDT(false);
        }
    };

    const handleSendBNB = async (recipient, amount) => {
        try {
            setIsSendingBNB(true);
            setBnbStatus('Sending BNB...');
            const receipt = await sendBNB(wallet.privateKey, recipient, amount);
            console.log("BNB Receipt:", receipt);
            setBnbStatus(`✅ Sent ${amount} BNB successfully!`);
            fetchBNBBalance(wallet.address);
            fetchBNBTransactions();
        } catch (e) {
            console.error("BNB send failed:", e);
            setBnbStatus(`❌ Failed: ${e.message}`);
        } finally {
            setIsSendingBNB(false);
        }
    };

    // ========================================================================
    // RENDER
    // ========================================================================

    return (
        <div className="wallet-dashboard">
            {/* STICKY HEADER */}
            <header className="wallet-header">
                <h1 className="header-title">💼 JoyTrade Wallet</h1>
                <p className="header-subtitle">Manage your crypto, send & receive securely</p>
            </header>

            {/* NO WALLET STATE */}
            {!wallet && (
                <div className="empty-state">
                    <div className="empty-state-content">
                        <h2>No Wallet Found</h2>
                        <p>Create a new wallet to get started</p>
                        <button className="action-btn primary" onClick={handleCreateWallet}>
                            ✨ Create New Wallet
                        </button>
                    </div>
                </div>
            )}

            {/* WITH WALLET STATE - GRID LAYOUT */}
            {wallet && (
                <>
                    <main className="dashboard-grid">
                        {/* LEFT COLUMN - Wallet Info & Balances */}
                        <section className="grid-left">
                            <WalletInfoDisplay wallet={wallet} />

                            <div className="balance-card usdt-balance">
                                <p className="balance-label">💵 USDT Balance</p>
                                <h2 className="balance-amount">{usdtBalance ?? 'Loading...'}</h2>
                                <p className="balance-currency">USDT</p>
                            </div>

                            <div className="balance-card bnb-balance">
                                <p className="balance-label">⛓️ BNB Balance</p>
                                <h2 className="balance-amount">{bnbBalance ?? 'Loading...'}</h2>
                                <p className="balance-currency">BNB</p>
                            </div>
                        </section>

                        {/* RIGHT COLUMN - Tabs & Content */}
                        <section className="grid-right">
                            {/* CRYPTO TABS */}
                            <div className="crypto-tabs">
                                <button
                                    className={`tab-btn ${selectedTab === CRYPTO_TYPES.USDT ? 'active' : ''}`}
                                    onClick={() => setSelectedTab(CRYPTO_TYPES.USDT)}
                                >
                                    💵 USDT
                                </button>
                                <button
                                    className={`tab-btn ${selectedTab === CRYPTO_TYPES.BNB ? 'active' : ''}`}
                                    onClick={() => setSelectedTab(CRYPTO_TYPES.BNB)}
                                >
                                    ⛓️ BNB
                                </button>
                            </div>

                            {/* USDT TAB CONTENT */}
                            {selectedTab === CRYPTO_TYPES.USDT && (
                                <div className="tab-grid">
                                    <SendCryptoPanel
                                        type={CRYPTO_TYPES.USDT}
                                        balance={usdtBalance}
                                        wallet={wallet}
                                        onSend={handleSendUSDT}
                                        isLoading={isSendingUSDT}
                                        status={usdtStatus}
                                    />

                                    <ReceiveCryptoPanel type={CRYPTO_TYPES.USDT} wallet={wallet} />

                                    <TransactionHistory type={CRYPTO_TYPES.USDT} transactions={usdtTransactions} />
                                </div>
                            )}

                            {/* BNB TAB CONTENT */}
                            {selectedTab === CRYPTO_TYPES.BNB && (
                                <div className="tab-grid">
                                    <SendCryptoPanel
                                        type={CRYPTO_TYPES.BNB}
                                        balance={bnbBalance}
                                        wallet={wallet}
                                        onSend={handleSendBNB}
                                        isLoading={isSendingBNB}
                                        status={bnbStatus}
                                    />

                                    <ReceiveCryptoPanel type={CRYPTO_TYPES.BNB} wallet={wallet} />

                                    <TransactionHistory type={CRYPTO_TYPES.BNB} transactions={bnbTransactions} />
                                </div>
                            )}
                        </section>

                        {/* ESCROW PANEL - FULL WIDTH */}
                        <section className="grid-full">
                            <EscrowDevPanel />
                        </section>
                    </main>

                    {/* FOOTER NAVIGATION */}
                    <nav className="wallet-navigation">
                        <button className="action-btn primary" onClick={() => navigate('/marketplace')}>
                            🛍️ Marketplace
                        </button>
                        <button className="action-btn secondary" onClick={() => navigate('/dashboard')}>
                            📊 Dashboard
                        </button>
                    </nav>
                </>
            )}

            {/* ERROR MESSAGE */}
            {error && (
                <div className="error-container">
                    <div className="error-message">
                        <strong>Error:</strong> {error}
                    </div>
                </div>
            )}
        </div>
    );
}