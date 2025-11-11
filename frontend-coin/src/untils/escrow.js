import { ethers } from "ethers";
import BSC_MAINNET from "../configurations/chain";
import escrowAbi from "../abi/JoyTradeEscrow.json";

/**
 * Connects to the JoyTrade Escrow contract using the user's wallet.
 */
export async function getEscrowContract() {
    if (!window.ethereum) throw new Error("No wallet found. Please install MetaMask or use JoyTrade Wallet.");

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    return new ethers.Contract(
        BSC_MAINNET.escrowAddress,
        escrowAbi.abi,
        signer
    );
}

/**
 * Example: create a new deal
 */
export async function createDeal(buyer, seller, token, amount, expiresAt, feeBps, metadata) {
    const contract = await getEscrowContract();
    const tx = await contract.createDeal(buyer, seller, token, amount, expiresAt, feeBps, metadata);
    await tx.wait();
    return tx.hash;
}
