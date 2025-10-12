// src/untils/blockchain.js
import { ethers } from "ethers";
import { provider, getSignerFromPrivateKey } from "./provider";
import BSC from "../configurations/chain";

// USDT (BEP-20) on BSC Mainnet
const USDT_ADDRESS = process.env.REACT_APP_USDT_ADDRESS || BSC.usdtAddress;

const USDT_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function transfer(address to, uint amount) returns (bool)",
];

/**
 * Get USDT balance (human-readable string)
 */
export async function getUSDTBalance(walletAddress) {
    try {
        const contract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);
        const rawBalance = await contract.balanceOf(walletAddress);
        const decimals = await contract.decimals();
        return ethers.formatUnits(rawBalance, decimals);
    } catch (err) {
        console.error("USDT Balance Error:", err);
        return "0";
    }
}

/**
 * Send USDT (needs BNB for gas)
 * @param {string} privateKey - JoyTrade wallet private key
 * @param {string} toAddress  - destination address
 * @param {string} amount     - human string (e.g., "12.5")
 */
export async function sendUSDT(privateKey, toAddress, amount) {
    try {
        const signer = getSignerFromPrivateKey(privateKey);
        const contract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);

        // Ensure there is gas (BNB)
        const bnbBalance = await provider.getBalance(await signer.getAddress());
        if (bnbBalance === 0n) {
            throw new Error("Insufficient BNB for gas fees. Please add BNB to your wallet.");
        }

        const decimals = await contract.decimals();
        const value = ethers.parseUnits(amount, decimals);

        // (Optional) estimate gas
        const gasEstimate = await contract.transfer.estimateGas(toAddress, value);
        console.log("Estimated gas:", gasEstimate.toString());

        const tx = await contract.transfer(toAddress, value);
        console.log("Transaction sent:", tx.hash);
        console.log("View on BSCScan:", `https://bscscan.com/tx/${tx.hash}`);

        return await tx.wait();
    } catch (err) {
        console.error("USDT Send Error:", err);
        throw err;
    }
}

/**
 * Get BNB balance (native)
 */
export async function getBNBBalance(walletAddress) {
    try {
        const balance = await provider.getBalance(walletAddress);
        return ethers.formatEther(balance);
    } catch (err) {
        console.error("BNB Balance Error:", err);
        return "0";
    }
}

/**
 * Send BNB
 */
export async function sendBNB(privateKey, toAddress, amount) {
    try {
        const signer = getSignerFromPrivateKey(privateKey);

        const balance = await provider.getBalance(await signer.getAddress());
        const amountWei = ethers.parseEther(amount);

        if (balance < amountWei) {
            throw new Error(`Insufficient BNB. Balance: ${ethers.formatEther(balance)} BNB`);
        }

        // (Optional) estimates
        const gasEstimate = await provider.estimateGas({ to: toAddress, value: amountWei });
        const feeData = await provider.getFeeData();
        console.log("Gas estimate:", gasEstimate.toString());
        console.log("Gas price:", feeData.gasPrice?.toString?.());

        const tx = await signer.sendTransaction({ to: toAddress, value: amountWei });
        console.log("Transaction sent:", tx.hash);
        console.log("View on BSCScan:", `https://bscscan.com/tx/${tx.hash}`);

        return await tx.wait();
    } catch (err) {
        console.error("BNB Send Error:", err);
        throw err;
    }
}

/**
 * (Optional) Transaction history via BSCScan (requires API key)
 */
export async function getTransactionHistory(walletAddress, apiKey = null) {
    if (!apiKey) {
        console.warn("BSCScan API key not provided. Returning empty history.");
        return { bnb: [], usdt: [] };
    }
    try {
        const bnbUrl  = `https://api.bscscan.com/api?module=account&action=txlist&address=${walletAddress}&startblock=0&endblock=99999999&sort=desc&apikey=${apiKey}`;
        const usdtUrl = `https://api.bscscan.com/api?module=account&action=tokentx&contractaddress=${USDT_ADDRESS}&address=${walletAddress}&startblock=0&endblock=99999999&sort=desc&apikey=${apiKey}`;

        const [bnbResponse, usdtResponse] = await Promise.all([
            fetch(bnbUrl).then(r => r.json()),
            fetch(usdtUrl).then(r => r.json()),
        ]);

        return {
            bnb:  bnbResponse?.result  || [],
            usdt: usdtResponse?.result || [],
        };
    } catch (err) {
        console.error("Transaction history error:", err);
        return { bnb: [], usdt: [] };
    }
}

/**
 * Validate BSC address
 */
export function isValidBSCAddress(address) {
    return ethers.isAddress(address);
}

/**
 * Current gas price (gwei)
 */
export async function getGasPrice() {
    try {
        const feeData = await provider.getFeeData();
        return feeData.gasPrice ? ethers.formatUnits(feeData.gasPrice, "gwei") : "5";
    } catch (err) {
        console.error("Gas price error:", err);
        return "5";
    }
}

// Reference, if you need to display network info in UI
export const NETWORK_CONFIG = {
    chainId: 56,
    chainName: "BNB Smart Chain Mainnet",
    rpcUrl: process.env.REACT_APP_BSC_RPC || BSC.rpcUrl,
    blockExplorer: "https://bscscan.com",
    nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
};
