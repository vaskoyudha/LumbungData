import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    besu: {
      url: process.env["BESU_URL"] ?? "http://localhost:8545",
      accounts: process.env["BESU_PRIVATE_KEY"]
        ? [process.env["BESU_PRIVATE_KEY"]]
        : [],
    },
  },
};

export default config;
