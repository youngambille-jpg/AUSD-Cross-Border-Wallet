import { defineConfig } from "hardhat/config";

const rpcUrl = process.env.MONAD_TESTNET_RPC_URL ?? "https://testnet-rpc.monad.xyz";
const deployerKey = process.env.DEPLOYER_PRIVATE_KEY;

export default defineConfig({
  solidity: "0.8.28",
  networks: {
    monadTestnet: {
      type: "http",
      chainType: "l1",
      chainId: 10143,
      url: rpcUrl,
      accounts: deployerKey ? [deployerKey] : [],
    },
  },
});
