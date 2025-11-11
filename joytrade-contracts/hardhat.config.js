require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
    solidity: "0.8.24",
    networks: {
        bsc: {
            url: process.env.BSC_RPC,
            chainId: 56,
            accounts: [process.env.PRIVATE_KEY],
        },
    },
};
