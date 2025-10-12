// src/untils/provider.js
import { JsonRpcProvider, Wallet } from "ethers";
import BSC from "../configurations/chain";

// Prefer .env, fall back to configurations/chain.js
const RPC_URL  = process.env.REACT_APP_BSC_RPC  || BSC.rpcUrl;
const CHAIN_ID = Number(process.env.REACT_APP_CHAIN_ID || BSC.chainId);

// Read-only provider for BSC mainnet
export const provider = new JsonRpcProvider(RPC_URL, CHAIN_ID);

// Make a signer from your JoyTrade private key (string like "0xabc...")
export function getSignerFromPrivateKey(privateKey) {
    if (!privateKey) throw new Error("Private key missing");
    return new Wallet(privateKey, provider);
}

// Quick helper: get address without network call
export function getAddressFromPrivateKey(privateKey) {
    if (!privateKey) throw new Error("Private key missing");
    return new Wallet(privateKey).address;
}

// Optional sanity check
export async function isOnCorrectNetwork() {
    const net = await provider.getNetwork();
    return Number(net.chainId) === CHAIN_ID;
}
