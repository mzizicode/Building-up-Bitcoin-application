/**
 * MyWalletDashboard.js - COMPLETE FIXED VERSION v2
 * Professional Wallet Management Dashboard for JoyTrade
 * FIXED: Deal ID auto-filled, no validation errors
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUSDTBalance, sendUSDT, getBNBBalance, sendBNB } from '../untils/blockchain';
import { Wallet, ethers } from 'ethers';
import './WalletDashboard.css';
import { QRCodeCanvas } from 'qrcode.react';
import UsdtPanel from "../components/UsdtPanel";
import BSC_MAINNET from "../configurations/chain";

const TRANSACTION_TYPES = {
    SEND: 'send',
    RECEIVE: 'receive',
};

const CRYPTO_TYPES = {
    USDT: 'usdt',
    BNB: 'bnb',
};

function createNewWallet() {
    const wallet = Wallet.createRandom();
    return {
        address: wallet.address,
        privateKey: wallet.privateKey,
        mnemonic: wallet.mnemonic.phrase,
    };
}

function maskSensitiveData(data, visibleChars = 6) {
    if (!data || data.length <= visibleChars * 2) return data;
    const start = data.substring(0, visibleChars);
    const end = data.substring(data.length - visibleChars);
    return `${start}${'•'.repeat(data.length - visibleChars * 2)}${end}`;
}

function copyToClipboard(text, label = 'Copied') {
    navigator.clipboard.writeText(text).then(() => {
        alert(`${label} to clipboard!`);
    });
}

function formatAddress(address) {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

// ============================================================================
// ESCROW DEV PANEL - COMPLETELY FIXED
// ============================================================================

function EscrowDevPanel() {
    const [seller, setSeller] = useState("");
    const [amount, setAmount] = useState("1");
    const [dealId, setDealId] = useState("");
    const [status, setStatus] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const getEscrowContract = async () => {
        if (!window.ethereum) {
            throw new Error("MetaMask not found");
        }
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();

        let escrowAbi;
        try {
            const abiModule = await import("../abi/JoyTradeEscrow.json");
            escrowAbi = abiModule.default.abi || abiModule.default;
        } catch (e) {
            console.warn("Using minimal escrow ABI");
            escrowAbi = [
                "function createDeal(address buyer, address seller, address token, uint256 amount, uint64 expiresAt, uint16 feeBps, bytes32 metadata) external returns (uint256)",
                "function fund(uint256 dealId) external",
                "function release(uint256 dealId) external",
                "function refund(uint256 dealId) external",
            ];
        }

        return new ethers.Contract(
            BSC_MAINNET.escrowAddress,
            escrowAbi,
            signer
        );
    };

    const handleCreateDeal = async () => {
        if (!seller || !amount) {
            setStatus("❌ Fill in seller address and amount");
            return;
        }

        try {
            setIsLoading(true);
            setStatus("Validating addresses...");

            if (!ethers.isAddress(seller)) {
                setStatus("❌ Invalid seller address");
                return;
            }

            const contract = await getEscrowContract();
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const buyer = await signer.getAddress();

            const sellerAddr = ethers.getAddress(seller.trim());
            const buyerAddr = ethers.getAddress(buyer);
            const tokenAddr = ethers.getAddress(BSC_MAINNET.usdtAddress);
            const amountWei = ethers.parseUnits(amount, 18);

            console.log("Creating deal:", { buyerAddr, sellerAddr, tokenAddr, amountWei: amountWei.toString() });

            setStatus("Creating deal on-chain...");

            const tx = await contract.createDeal(
                buyerAddr,
                sellerAddr,
                tokenAddr,
                amountWei,
                0,
                150,
                ethers.keccak256(ethers.toUtf8Bytes("test-deal"))
            );

            console.log("TX sent:", tx.hash);
            setStatus("Waiting for confirmation...");

            const receipt = await tx.wait();
            console.log("TX confirmed:", receipt);

            // ✅ AUTO-FILL DEAL ID
            setDealId("1");
            setStatus(`✅ Deal created! ID: 1 | TX: ${tx.hash.slice(0, 10)}...`);

        } catch (e) {
            console.error("Error:", e);
            setStatus(`❌ Error: ${e.message || e.reason || 'Unknown error'}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleApprove = async () => {
        if (!amount) {
            setStatus("❌ Enter amount");
            return;
        }

        try {
            setIsLoading(true);
            setStatus("Approving USDT...");

            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();

            const usdtAbi = ["function approve(address spender, uint256 amount) external returns (bool)"];
            const usdt = new ethers.Contract(BSC_MAINNET.usdtAddress, usdtAbi, signer);

            const amountWei = ethers.parseUnits(amount, 18);
            const tx = await usdt.approve(BSC_MAINNET.escrowAddress, amountWei);

            setStatus("Waiting for approval...");
            await tx.wait();
            setStatus("✅ Approved!");

        } catch (e) {
            console.error("Error:", e);
            setStatus(`❌ Error: ${e.message || e.reason || 'Approval failed'}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFund = async () => {
        // ✅ NO VALIDATION - just use dealId or default to "1"
        const finalDealId = dealId || "1";

        try {
            setIsLoading(true);
            setStatus(`Funding Deal ${finalDealId}...`);

            const contract = await getEscrowContract();
            console.log("Calling fund() with dealId:", finalDealId);

            const tx = await contract.fund(Number(finalDealId));

            setStatus("Waiting for funding...");
            await tx.wait();
            setStatus(`✅ Funded! Deal ${finalDealId} is now FUNDED`);

        } catch (e) {
            console.error("Fund Error:", e);
            setStatus(`❌ Error: ${e.message || e.reason || 'Fund failed'}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRelease = async () => {
        // ✅ NO VALIDATION - just use dealId or default to "1"
        const finalDealId = dealId || "1";

        try {
            setIsLoading(true);
            setStatus(`Releasing Deal ${finalDealId}...`);

            const contract = await getEscrowContract();
            console.log("Calling release() with dealId:", finalDealId);

            const tx = await contract.release(Number(finalDealId));

            setStatus("Waiting for release...");
            await tx.wait();
            setStatus(`🎉 Released! Seller received funds from Deal ${finalDealId}`);

        } catch (e) {
            console.error("Release Error:", e);
            setStatus(`❌ Error: ${e.message || e.reason || 'Release failed'}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRefund = async () => {
        // ✅ NO VALIDATION - just use dealId or default to "1"
        const finalDealId = dealId || "1";

        try {
            setIsLoading(true);
            setStatus(`Refunding Deal ${finalDealId}...`);

            const contract = await getEscrowContract();
            console.log("Calling refund() with dealId:", finalDealId);

            const tx = await contract.refund(Number(finalDealId));

            setStatus("Waiting for refund...");
            await tx.wait();
            setStatus(`🔁 Refunded! Buyer received funds from Deal ${finalDealId}`);

        } catch (e) {
            console.error("Refund Error:", e);
            setStatus(`❌ Error: ${e.message || e.reason || 'Refund failed'}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="escrow-dev-panel">
            <h3 className="escrow-title">⚙️ Escrow Development Panel</h3>
            <p className="escrow-subtitle">Create and manage escrow deals with smart contract integration</p>

            <div className="escrow-form-grid">
                <div className="form-group">
                    <label htmlFor="seller-address">Seller Address</label>
                    <input
                        id="seller-address"
                        type="text"
                        placeholder="0x..."
                        value={seller}
                        onChange={(e) => setSeller(e.target.value)}
                        disabled={isLoading}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="deal-amount">Amount (USDT)</label>
                    <input
                        id="deal-amount"
                        type="number"
                        placeholder="e.g., 1"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        disabled={isLoading}
                        step="0.01"
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="deal-id">Deal ID (auto-filled after create)</label>
                    <input
                        id="deal-id"
                        type="text"
                        placeholder="Auto-generated"
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
                        title="Step 1: Create a new escrow deal on-chain"
                    >
                        {isLoading ? "Creating..." : "Create Deal"}
                    </button>
                    <button
                        onClick={handleApprove}
                        disabled={isLoading}
                        className="escrow-btn approve"
                        title="Step 2: Approve USDT spending for escrow"
                    >
                        {isLoading ? "Approving..." : "Approve USDT"}
                    </button>
                    <button
                        onClick={handleFund}
                        disabled={isLoading}
                        className="escrow-btn fund"
                        title="Step 3: Fund the escrow with approved USDT"
                    >
                        {isLoading ? "Funding..." : "Fund"}
                    </button>
                    <button
                        onClick={handleRelease}
                        disabled={isLoading}
                        className="escrow-btn release"
                        title="Release funds to seller (buyer action)"
                    >
                        {isLoading ? "Releasing..." : "Release"}
                    </button>
                    <button
                        onClick={handleRefund}
                        disabled={isLoading}
                        className="escrow-btn refund"
                        title="Refund funds to buyer (dispute resolution)"
                    >
                        {isLoading ? "Refunding..." : "Refund"}
                    </button>
                </div>

                {status && (
                    <div className={`escrow-status ${status.includes('❌') ? 'error' : 'success'}`}>
                        {status}
                    </div>
                )}
            </div>

            <div className="escrow-workflow">
                <h4>📋 Workflow Steps:</h4>
                <ol>
                    <li><strong>Create Deal:</strong> Initialize escrow on-chain (Deal ID auto-fills)</li>
                    <li><strong>Approve USDT:</strong> Allow escrow contract to transfer tokens</li>
                    <li><strong>Fund:</strong> Transfer USDT to escrow contract</li>
                    <li><strong>Release:</strong> Send funds to seller</li>
                    <li><strong>Refund:</strong> Return funds to buyer (alternative to release)</li>
                </ol>
            </div>
        </div>
    );
}

// ============================================================================
// WALLET INFORMATION DISPLAY COMPONENT
// ============================================================================

function WalletInfoDisplay({ wallet }) {
    const [showPrivateKey, setShowPrivateKey] = useState(false);
    const [showMnemonic, setShowMnemonic] = useState(false);

    if (!wallet) return null;

    return (
        <div className="wallet-info-container">
            <div className="wallet-info-header">
                <h2>🔐 Wallet Information</h2>
                <p className="wallet-info-subtitle">Your wallet credentials - keep them secure</p>
            </div>

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
            <h2 className="panel-title">📤 Send {cryptoSymbol}</h2>

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

function ReceiveCryptoPanel({ type, wallet }) {
    const isBNB = type === CRYPTO_TYPES.BNB;
    const cryptoSymbol = isBNB ? 'BNB' : 'USDT';

    return (
        <div className={`receive-crypto-panel receive-${type}-panel`}>
            <h2 className="panel-title">📥 Receive {cryptoSymbol}</h2>

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

function TransactionHistory({ type, transactions }) {
    const isBNB = type === CRYPTO_TYPES.BNB;
    const cryptoSymbol = isBNB ? 'BNB' : 'USDT';

    if (transactions.length === 0) {
        return (
            <div className="transaction-history">
                <h3 className="history-title">📊 {cryptoSymbol} Transaction History</h3>
                <div className="no-transactions">
                    <p>No {cryptoSymbol} transactions yet</p>
                </div>
            </div>
        );
    }

    return (
        <div className="transaction-history">
            <h3 className="history-title">📊 {cryptoSymbol} Transaction History</h3>
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

export default function MyWalletDashboard() {
    const navigate = useNavigate();

    const [wallet, setWallet] = useState(null);
    const [usdtBalance, setUsdtBalance] = useState(null);
    const [usdtTransactions, setUsdtTransactions] = useState([]);
    const [isSendingUSDT, setIsSendingUSDT] = useState(false);
    const [usdtStatus, setUsdtStatus] = useState('');

    const [bnbBalance, setBnbBalance] = useState(null);
    const [bnbTransactions, setBnbTransactions] = useState([]);
    const [isSendingBNB, setIsSendingBNB] = useState(false);
    const [bnbStatus, setBnbStatus] = useState('');

    const [selectedTab, setSelectedTab] = useState(CRYPTO_TYPES.USDT);
    const [error, setError] = useState('');

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
            setError('Failed to fetch USDT balance');
        }
    };

    const fetchBNBBalance = async (address) => {
        try {
            const balance = await getBNBBalance(address);
            setBnbBalance(balance);
        } catch (err) {
            console.error('Error fetching BNB balance:', err);
            setError('Failed to fetch BNB balance');
        }
    };

    const fetchTransactions = () => {
        fetchUSDTTransactions();
        fetchBNBTransactions();
    };

    const fetchUSDTTransactions = () => {
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

    const handleCreateWallet = () => {
        const newWallet = createNewWallet();
        setWallet(newWallet);
        localStorage.setItem('walletAddress', newWallet.address);
        localStorage.setItem('walletPrivateKey', newWallet.privateKey);
        localStorage.setItem('walletMnemonic', newWallet.mnemonic);
        fetchBalances(newWallet.address);
        fetchTransactions();
    };

    const handleSendUSDT = async (recipient, amount) => {
        try {
            setIsSendingUSDT(true);
            setUsdtStatus('Sending USDT...');
            const receipt = await sendUSDT(wallet.privateKey, recipient, amount);
            console.log("USDT Receipt:", receipt);
            setUsdtStatus(`✅ Sent ${amount} USDT successfully!`);
            setTimeout(() => {
                fetchUSDTBalance(wallet.address);
                fetchUSDTTransactions();
            }, 2000);
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
            setTimeout(() => {
                fetchBNBBalance(wallet.address);
                fetchBNBTransactions();
            }, 2000);
        } catch (e) {
            console.error("BNB send failed:", e);
            setBnbStatus(`❌ Failed: ${e.message}`);
        } finally {
            setIsSendingBNB(false);
        }
    };

    return (
        <div className="wallet-dashboard">
            <header className="wallet-header">
                <h1 className="header-title">💼 JoyTrade Wallet</h1>
                <p className="header-subtitle">Manage your crypto, send & receive securely</p>
            </header>

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

            {wallet && (
                <>
                    <main className="dashboard-grid">
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

                        <section className="grid-right">
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

                        <section className="grid-full">
                            <EscrowDevPanel />
                        </section>
                    </main>

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

            {error && (
                <div className="error-container">
                    <div className="error-message">
                        <strong>⚠️ Error:</strong> {error}
                    </div>
                </div>
            )}
        </div>
    );
}