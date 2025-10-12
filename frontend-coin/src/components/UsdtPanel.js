// src/components/UsdtPanel.js
import React, { useEffect, useState } from "react";
import { getAddressFromPrivateKey } from "../untils/provider";
import { getBNBBalance, getUSDTBalance } from "../untils/blockchain";

const LOCAL_PK_KEY = "joytrade_pk"; // <-- where your app stores the private key

export default function UsdtPanel() {
    const [address, setAddress] = useState("");
    const [bnb, setBnb] = useState("0");
    const [usdt, setUsdt] = useState("0");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // 1) Load private key from localStorage and derive address
    useEffect(() => {
        try {
            const pk = (localStorage.getItem(LOCAL_PK_KEY) || "").trim();
            if (!pk) {
                setError("No JoyTrade wallet found. Please create/import a wallet.");
                return;
            }
            const addr = getAddressFromPrivateKey(pk);
            setAddress(addr);
        } catch (e) {
            setError("Invalid private key in localStorage.");
        }
    }, []);

    // 2) Fetch balances
    const refresh = async () => {
        if (!address) return;
        setLoading(true);
        setError("");
        try {
            const [bnbBal, usdtBal] = await Promise.all([
                getBNBBalance(address),
                getUSDTBalance(address),
            ]);
            setBnb(bnbBal);
            setUsdt(usdtBal);
        } catch (e) {
            console.error(e);
            setError("Failed to fetch balances. Check RPC/network.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (address) refresh();
    }, [address]);

    return (
        <div className="usdt-panel" style={{ padding: 16, borderRadius: 12, border: "1px solid #e5e7eb" }}>
            <h3 style={{ margin: 0, marginBottom: 8 }}>JoyTrade Wallet</h3>

            {!address ? (
                <p style={{ color: "#b91c1c" }}>{error || "Loading..."}</p>
            ) : (
                <>
                    <div style={{ fontSize: 12, color: "#6b7280", wordBreak: "break-all" }}>
                        Address: {address}
                    </div>

                    <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
                        <div>
                            <div style={{ fontSize: 12, color: "#6b7280" }}>BNB</div>
                            <div style={{ fontWeight: 600, fontSize: 18 }}>{bnb}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: 12, color: "#6b7280" }}>USDT</div>
                            <div style={{ fontWeight: 600, fontSize: 18 }}>{usdt}</div>
                        </div>
                    </div>

                    <button
                        onClick={refresh}
                        disabled={loading}
                        style={{
                            marginTop: 12,
                            padding: "8px 12px",
                            borderRadius: 8,
                            border: "1px solid #d1d5db",
                            background: loading ? "#f3f4f6" : "white",
                            cursor: loading ? "not-allowed" : "pointer",
                        }}
                    >
                        {loading ? "Refreshing…" : "Refresh"}
                    </button>

                    {error && <p style={{ color: "#b91c1c", marginTop: 8 }}>{error}</p>}
                </>
            )}
        </div>
    );
}
