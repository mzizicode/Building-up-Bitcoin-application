// src/wallet.js
import { BrowserProvider, Contract, formatUnits, parseUnits } from 'ethers';
import { BSC_TESTNET } from './chain';
import { ERC20_ABI, USDT_ADDRESS } from './token';

// make TypeScript happy if present; harmless in JS
if (typeof window !== 'undefined') {
    window.ethereum?.on?.('chainChanged', () => window.location.reload());
    window.ethereum?.on?.('accountsChanged', () => window.location.reload());
}

function getProvider() {
    if (!window.ethereum) throw new Error('MetaMask not found in this browser');
    return new BrowserProvider(window.ethereum);
}

export async function ensureBscTestnet() {
    const provider = getProvider();
    const chainId = await provider.send('eth_chainId', []);
    if (chainId?.toLowerCase() === BSC_TESTNET.chainId.toLowerCase()) return;

    try {
        await provider.send('wallet_switchEthereumChain', [{ chainId: BSC_TESTNET.chainId }]);
    } catch (err) {
        // 4902 = chain not added
        if (err?.code === 4902) {
            await provider.send('wallet_addEthereumChain', [BSC_TESTNET]);
            await provider.send('wallet_switchEthereumChain', [{ chainId: BSC_TESTNET.chainId }]);
        } else {
            throw err;
        }
    }
}

export async function connectWallet() {
    await ensureBscTestnet();
    const provider = getProvider();
    const accounts = await provider.send('eth_requestAccounts', []);
    if (!accounts?.length) throw new Error('No account returned from MetaMask');
    return accounts[0];
}

function getUsdtContractWithSigner() {
    const provider = getProvider();
    return provider.getSigner().then(
        (signer) => new Contract(USDT_ADDRESS, ERC20_ABI, signer)
    );
}

export async function readUsdtBalance(address) {
    const c = await getUsdtContractWithSigner();
    const [decimals, raw] = await Promise.all([c.decimals(), c.balanceOf(address)]);
    return { decimals, raw, formatted: formatUnits(raw, decimals) };
}

export async function transferUsdt(to, humanAmount) {
    const c = await getUsdtContractWithSigner();
    const decimals = await c.decimals();
    const value = parseUnits(String(humanAmount), decimals); // "5" => 5 USDT
    const tx = await c.transfer(to, value);
    return tx.wait(); // wait for confirmation
}

export async function watchUsdtInMetaMask() {
    // asks MetaMask to show your token in the wallet UI
    try {
        const provider = getProvider();
        return await provider.send('wallet_watchAsset', [{
            type: 'ERC20',
            options: { address: USDT_ADDRESS, symbol: 'USDT', decimals: 6 },
        }]);
    } catch (e) {
        console.warn('wallet_watchAsset failed', e);
        return false;
    }
}
