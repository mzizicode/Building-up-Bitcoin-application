const hre = require("hardhat");

async function main() {
    const owner = process.env.OWNER;
    const feeCollector = process.env.FEE_COLLECTOR;
    if (!owner || !feeCollector) throw new Error("Please set OWNER and FEE_COLLECTOR in .env");

    const Escrow = await hre.ethers.getContractFactory("JoyTradeEscrow");
    const escrow = await Escrow.deploy(owner, feeCollector);

    // ethers v6:
    await escrow.waitForDeployment();

    const addr = await escrow.getAddress();
    console.log("JoyTradeEscrow deployed to:", addr);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});

