import { ethers } from "ethers";
import BSC_MAINNET from "../configurations/chain";
import escrowAbiJson from "../abi/JoyTradeEscrow.json";

/**
 * Helper: normalize an Ethereum/BSC address.
 */
function normalizeAddress(addr, label = "address") {
    if (!addr) {
        throw new Error(`Missing ${label}`);
    }

    try {
        const trimmed = addr.trim();
        return ethers.getAddress(trimmed);
    } catch (e) {
        throw new Error(`Invalid ${label}: ${addr}`);
    }
}

/**
 * Get the correct ABI from the imported JSON
 */
function getEscrowAbi() {
    if (escrowAbiJson.abi) {
        return escrowAbiJson.abi;
    }
    if (Array.isArray(escrowAbiJson)) {
        return escrowAbiJson;
    }
    return escrowAbiJson;
}

/**
 * Connects to the JoyTradeEscrow contract with the user's wallet.
 */
export async function getEscrowContract() {
    if (!window.ethereum) {
        throw new Error("No wallet found. Please install MetaMask.");
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    const abi = getEscrowAbi();
    console.log("Using escrow ABI:", abi.length, "functions/events");

    return new ethers.Contract(
        BSC_MAINNET.escrowAddress,
        abi,
        signer
    );
}

/**
 * Creates a new escrow deal on-chain.
 * Returns: { txHash, dealId }
 */
export async function createDeal(
    buyer,
    seller,
    token,
    amountWei,
    expiresAt,
    feeBps,
    metadata
) {
    try {
        const contract = await getEscrowContract();

        console.log("=== RAW INPUTS ===");
        console.log("Buyer:", buyer);
        console.log("Seller:", seller);
        console.log("Token:", token);

        let buyerAddress = normalizeAddress(buyer, "buyer address");
        let sellerAddress = normalizeAddress(seller, "seller address");
        let tokenAddress = normalizeAddress(token, "token address");

        console.log("✅ All addresses normalized");

        const tx = await contract.createDeal(
            buyerAddress,
            sellerAddress,
            tokenAddress,
            amountWei,
            expiresAt,
            feeBps,
            metadata
        );

        console.log("✅ Transaction sent:", tx.hash);
        const receipt = await tx.wait();
        console.log("✅ Transaction mined");

        let dealId = "1";

        if (receipt && receipt.logs && receipt.logs.length > 0) {
            try {
                const abi = getEscrowAbi();
                const iface = new ethers.Interface(abi);

                for (const log of receipt.logs) {
                    try {
                        const parsed = iface.parseLog(log);
                        if (parsed && parsed.name === "DealCreated") {
                            dealId = parsed.args[0].toString();
                            console.log("✅ Deal ID:", dealId);
                            break;
                        }
                    } catch (logErr) {
                        continue;
                    }
                }
            } catch (parseErr) {
                console.warn("Could not parse events");
            }
        }

        return { txHash: tx.hash, dealId: dealId, receipt: receipt };

    } catch (error) {
        console.error("❌ Error in createDeal:", error);
        throw error;
    }
}

export async function fundDeal(dealId) {
    try {
        const contract = await getEscrowContract();
        const tx = await contract.fund(Number(dealId));
        const receipt = await tx.wait();
        return { txHash: tx.hash, receipt: receipt };
    } catch (error) {
        console.error("❌ Error funding deal:", error);
        throw error;
    }
}

export async function releaseDeal(dealId) {
    try {
        const contract = await getEscrowContract();
        const tx = await contract.release(Number(dealId));
        const receipt = await tx.wait();
        return { txHash: tx.hash, receipt: receipt };
    } catch (error) {
        console.error("❌ Error releasing deal:", error);
        throw error;
    }
}

export async function refundDeal(dealId) {
    try {
        const contract = await getEscrowContract();
        const tx = await contract.refund(Number(dealId));
        const receipt = await tx.wait();
        return { txHash: tx.hash, receipt: receipt };
    } catch (error) {
        console.error("❌ Error refunding deal:", error);
        throw error;
    }
}

export async function cancelDeal(dealId) {
    try {
        const contract = await getEscrowContract();
        const tx = await contract.cancel(Number(dealId));
        const receipt = await tx.wait();
        return { txHash: tx.hash, receipt: receipt };
    } catch (error) {
        console.error("❌ Error canceling deal:", error);
        throw error;
    }
}

export async function getDeal(dealId) {
    try {
        const contract = await getEscrowContract();
        const deal = await contract.getDeal(Number(dealId));
        return deal;
    } catch (error) {
        console.error("❌ Error fetching deal:", error);
        throw error;
    }
}