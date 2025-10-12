// src/pages/MyWalletDashboard.js
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUSDTBalance, sendUSDT, getBNBBalance, sendBNB } from '../untils/blockchain';
import { Wallet } from 'ethers';
import './WalletDashboard.css';
import { QRCodeCanvas } from 'qrcode.react';
import UsdtPanel from "../components/UsdtPanel";

function createNewWallet() {
    const wallet = Wallet.createRandom();
    return {
        address: wallet.address,
        privateKey: wallet.privateKey,
        mnemonic: wallet.mnemonic.phrase,
    };
}

export default function MyWalletDashboard() {
    const navigate = useNavigate();
    const [wallet, setWallet] = useState(null);

    // USDT states
    const [usdtBalance, setUsdtBalance] = useState(null);
    const [recipient, setRecipient] = useState('');
    const [amount, setAmount] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [sendStatus, setSendStatus] = useState('');

    // BNB states
    const [bnbBalance, setBnbBalance] = useState(null);
    const [bnbRecipient, setBnbRecipient] = useState('');
    const [bnbAmount, setBnbAmount] = useState('');
    const [isSendingBNB, setIsSendingBNB] = useState(false);
    const [bnbStatus, setBnbStatus] = useState('');
    const [bnbTransactions, setBnbTransactions] = useState([]);

    // USDT transactions
    const [usdtTransactions, setUsdtTransactions] = useState([]);

    // tab state
    const [selectedTab, setSelectedTab] = useState('usdt');

    const [error, setError] = useState('');

    useEffect(() => {
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
            fetchUSDTBalance(storedAddress);
            fetchBNBBalance(storedAddress);
            fetchBNBTransactions(storedAddress);
            fetchUSDTTransactions(storedAddress);
        }
    }, []);

    async function fetchUSDTBalance(address) {
        const balance = await getUSDTBalance(address);
        setUsdtBalance(balance);
    }

    async function fetchBNBBalance(address) {
        const balance = await getBNBBalance(address);
        setBnbBalance(balance);
    }

    // Mock function for BNB transactions - replace with real BSCScan API later
    async function fetchBNBTransactions(address) {
        // Simulated transaction data
        const mockTransactions = [
            {
                type: 'send',
                to: '0xabc123def456...',
                amount: '0.2',
                hash: '0x1111222233334444555566667777888899990000aaaabbbbccccddddeeee',
                timestamp: new Date(Date.now() - 3600000).toLocaleString(),
            },
            {
                type: 'receive',
                from: '0xdef456abc789...',
                amount: '0.5',
                hash: '0x2222333344445555666677778888999900001111aaaabbbbccccddddeeee',
                timestamp: new Date(Date.now() - 7200000).toLocaleString(),
            },
        ];

        setBnbTransactions(mockTransactions);
        return mockTransactions;
    }

    // Mock function for USDT transactions
    async function fetchUSDTTransactions(address) {
        const mockTransactions = [
            {
                type: 'send',
                to: '0x789abc123def...',
                amount: '10.5',
                hash: '0x3333444455556666777788889999000011112222aaaabbbbccccddddeeee',
                timestamp: new Date(Date.now() - 5400000).toLocaleString(),
            },
            {
                type: 'receive',
                from: '0x456def789abc...',
                amount: '25.0',
                hash: '0x4444555566667777888899990000111122223333aaaabbbbccccddddeeee',
                timestamp: new Date(Date.now() - 10800000).toLocaleString(),
            },
        ];

        setUsdtTransactions(mockTransactions);
        return mockTransactions;
    }

    function handleCreateWallet() {
        const newWallet = createNewWallet();
        setWallet(newWallet);
        localStorage.setItem('walletAddress', newWallet.address);
        localStorage.setItem('walletPrivateKey', newWallet.privateKey);
        localStorage.setItem('walletMnemonic', newWallet.mnemonic);
        fetchUSDTBalance(newWallet.address);
        fetchBNBBalance(newWallet.address);
        fetchBNBTransactions(newWallet.address);
        fetchUSDTTransactions(newWallet.address);
    }

    async function handleSendUSDT() {
        if (!recipient || !amount) {
            setSendStatus("Please enter recipient and amount");
            return;
        }
        try {
            setIsSending(true);
            setSendStatus("Sending...");
            const receipt = await sendUSDT(wallet.privateKey, recipient, amount);
            console.log("USDT Receipt:", receipt);
            setSendStatus(`Sent ${amount} USDT successfully!`);
            fetchUSDTBalance(wallet.address);
            fetchUSDTTransactions(wallet.address);
        } catch (e) {
            console.error("Send failed:", e);
            setSendStatus(`Failed: ${e.message}`);
        } finally {
            setIsSending(false);
        }
    }

    async function handleSendBNB() {
        if (!bnbRecipient || !bnbAmount) {
            setBnbStatus("Please enter recipient and amount");
            return;
        }
        try {
            setIsSendingBNB(true);
            setBnbStatus("Sending BNB...");
            const receipt = await sendBNB(wallet.privateKey, bnbRecipient, bnbAmount);
            console.log("BNB Receipt:", receipt);
            setBnbStatus(`Sent ${bnbAmount} BNB successfully!`);
            fetchBNBBalance(wallet.address);
            fetchBNBTransactions(wallet.address);
        } catch (e) {
            console.error("Send BNB failed:", e);
            setBnbStatus(`${e.message}`);
        } finally {
            setIsSendingBNB(false);
        }
    }

    return (
        <div className="wallet-dashboard">
            <div className="wallet-header">
                <h1>My JoyTrade Wallet</h1>
                <p>Manage your wallet, check balance & send crypto</p>
            </div>

            {!wallet && (
                <div className="wallet-actions">
                    <button className="action-btn top-up" onClick={handleCreateWallet}>
                        Create New Wallet
                    </button>
                </div>
            )}

            {wallet && (
                <>
                    <div className="wallet-info">
                        <p><strong>Address:</strong> {wallet.address}</p>
                        <p><strong>Private Key:</strong> {wallet.privateKey}</p>
                        <p><strong>Mnemonic:</strong> {wallet.mnemonic}</p>
                    </div>

                    {/* Tab Selector */}
                    <div className="wallet-tabs">
                        <button
                            className={selectedTab === "usdt" ? "active-tab" : ""}
                            onClick={() => setSelectedTab("usdt")}
                        >
                            USDT
                        </button>
                        <button
                            className={selectedTab === "bnb" ? "active-tab" : ""}
                            onClick={() => setSelectedTab("bnb")}
                        >
                            BNB
                        </button>
                    </div>

                    {/* USDT Panel */}
                    {selectedTab === "usdt" && (
                        <>
                            <div className="balance-display">
                                <h3>USDT Balance: {usdtBalance ?? 'Loading...'} USDT</h3>
                            </div>

                            <div className="send-usdt-panel">
                                <h2>Send USDT</h2>
                                <label>
                                    Recipient Address:
                                    <input
                                        type="text"
                                        value={recipient}
                                        onChange={(e) => setRecipient(e.target.value)}
                                        placeholder="0x..."
                                    />
                                </label>
                                <label>
                                    Amount (USDT):
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="e.g. 1.5"
                                    />
                                </label>
                                <button onClick={handleSendUSDT} disabled={isSending}>
                                    {isSending ? "Sending..." : "Send USDT"}
                                </button>
                                {sendStatus && <p className="status-message">{sendStatus}</p>}
                            </div>

                            <div className="receive-usdt-panel">
                                <h2>Receive USDT</h2>
                                <p><strong>Your Wallet Address:</strong></p>
                                <p className="address-box">{wallet.address}</p>
                                <div className="qr-box">
                                    <QRCodeCanvas value={wallet.address} size={160} />
                                </div>
                                <button
                                    className="action-btn"
                                    onClick={() => {
                                        navigator.clipboard.writeText(wallet.address);
                                        alert("Wallet address copied!");
                                    }}
                                >
                                    Copy Wallet Address
                                </button>
                            </div>

                            {/* USDT Transaction History */}
                            <div className="transaction-history">
                                <h3>USDT Transactions</h3>
                                {usdtTransactions.length === 0 ? (
                                    <p className="no-transactions">No USDT transactions yet</p>
                                ) : (
                                    usdtTransactions.map((tx, index) => (
                                        <div key={index} className="transaction-item">
                                            <div className="transaction-icon">
                                                {tx.type === "send" ? "↑" : "↓"}
                                            </div>
                                            <div className="transaction-details">
                                                <h4>{tx.type === "send" ? "Sent" : "Received"} {tx.amount} USDT</h4>
                                                <p className="transaction-meta">
                                                    {tx.type === "send" ? `To: ${tx.to}` : `From: ${tx.from}`}
                                                </p>
                                                <p className="transaction-meta">{tx.timestamp}</p>
                                                <p className="reference-id">
                                                    Tx Hash: {tx.hash.slice(0, 20)}...
                                                </p>
                                            </div>
                                            <a
                                                href={`https://testnet.bscscan.com/tx/${tx.hash}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="view-on-chain"
                                            >
                                                View on BscScan
                                            </a>
                                        </div>
                                    ))
                                )}
                            </div>
                        </>
                    )}

                    {/* BNB Panel */}
                    {selectedTab === "bnb" && (
                        <>
                            <div className="balance-display">
                                <h3>BNB Balance: {bnbBalance ?? 'Loading...'} BNB</h3>
                            </div>

                            <div className="send-bnb-panel">
                                <h2>Send BNB</h2>
                                <label>
                                    Recipient Address:
                                    <input
                                        type="text"
                                        value={bnbRecipient}
                                        onChange={(e) => setBnbRecipient(e.target.value)}
                                        placeholder="0x..."
                                    />
                                </label>
                                <label>
                                    Amount (BNB):
                                    <input
                                        type="number"
                                        value={bnbAmount}
                                        onChange={(e) => setBnbAmount(e.target.value)}
                                        placeholder="e.g. 0.1"
                                    />
                                </label>
                                <button onClick={handleSendBNB} disabled={isSendingBNB}>
                                    {isSendingBNB ? "Sending..." : "Send BNB"}
                                </button>
                                {bnbStatus && <p className="status-message">{bnbStatus}</p>}
                            </div>

                            {/* BNB Receive Panel */}
                            <div className="receive-bnb-panel">
                                <h2>Receive BNB</h2>
                                <p><strong>Your Wallet Address:</strong></p>
                                <p className="address-box">{wallet.address}</p>
                                <div className="qr-box">
                                    <QRCodeCanvas value={wallet.address} size={160} />
                                </div>
                                <button
                                    className="action-btn"
                                    onClick={() => {
                                        navigator.clipboard.writeText(wallet.address);
                                        alert("BNB wallet address copied!");
                                    }}
                                >
                                    Copy Wallet Address
                                </button>
                            </div>

                            {/* BNB Transaction History */}
                            <div className="transaction-history">
                                <h3>BNB Transactions</h3>
                                {bnbTransactions.length === 0 ? (
                                    <p className="no-transactions">No BNB transactions yet</p>
                                ) : (
                                    bnbTransactions.map((tx, index) => (
                                        <div key={index} className="transaction-item">
                                            <div className="transaction-icon">
                                                {tx.type === "send" ? "↑" : "↓"}
                                            </div>
                                            <div className="transaction-details">
                                                <h4>{tx.type === "send" ? "Sent" : "Received"} {tx.amount} BNB</h4>
                                                <p className="transaction-meta">
                                                    {tx.type === "send" ? `To: ${tx.to}` : `From: ${tx.from}`}
                                                </p>
                                                <p className="transaction-meta">{tx.timestamp}</p>
                                                <p className="reference-id">
                                                    Tx Hash: {tx.hash.slice(0, 20)}...
                                                </p>
                                            </div>
                                            <a
                                                href={`https://testnet.bscscan.com/tx/${tx.hash}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="view-on-chain"
                                            >
                                                View on BscScan
                                            </a>
                                        </div>
                                    ))
                                )}
                            </div>
                        </>
                    )}
                </>
            )}

            <div className="wallet-navigation">
                <button className="action-btn marketplace" onClick={() => navigate('/marketplace')}>
                    Go to Marketplace
                </button>
                <button className="action-btn dashboard" onClick={() => navigate('/dashboard')}>
                    Back to Dashboard
                </button>
            </div>

            {error && <div className="error-message">{error}</div>}
        </div>
    );
}