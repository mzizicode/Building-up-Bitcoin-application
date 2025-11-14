import { ethers } from "ethers";
import BSC_MAINNET from "../configurations/chain";

const ERC20_ABI = [
    "function approve(address spender, uint256 value) external returns (bool)",
    "function allowance(address owner, address spender) external view returns (uint256)",
    "function decimals() view returns (uint8)",
];

export async function getUsdtContract(signerOrProvider) {
    // ✅ Normalize the USDT address
    const normalizedUsdtAddress = ethers.getAddress(BSC_MAINNET.usdtAddress);
    return new ethers.Contract(normalizedUsdtAddress, ERC20_ABI, signerOrProvider);
}

export async function getSigner() {
    if (!window.ethereum) throw new Error("No wallet found");
    const provider = new ethers.BrowserProvider(window.ethereum);
    return provider.getSigner();
}

export async function approveUSDT(spender, amountWei) {
    // ✅ Normalize the spender address
    const normalizedSpender = ethers.getAddress(spender);
    const signer = await getSigner();
    const usdt = await getUsdtContract(signer);
    const tx = await usdt.approve(normalizedSpender, amountWei);
    return tx.wait();
}