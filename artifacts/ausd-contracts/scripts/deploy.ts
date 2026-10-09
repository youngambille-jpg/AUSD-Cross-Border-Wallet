import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { defineChain, getAddress, http, createPublicClient, createWalletClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const chain = defineChain({
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: { name: 'Monad', symbol: 'MON', decimals: 18 },
  rpcUrls: { default: { http: [process.env.MONAD_TESTNET_RPC_URL ?? 'https://testnet-rpc.monad.xyz'] } },
});
const rpcUrl = process.env.MONAD_TESTNET_RPC_URL ?? 'https://testnet-rpc.monad.xyz';
const rawKey = process.env.DEPLOYER_PRIVATE_KEY?.trim();
if (!rawKey || !/^0x[0-9a-fA-F]{64}$/.test(rawKey)) {
  throw new Error('Set DEPLOYER_PRIVATE_KEY to a Monad testnet deployer key in the environment.');
}

const tokenAddress = getAddress(process.env.AUSD_TESTNET_ADDRESS ?? '0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC');
const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
const tokenCode = await publicClient.getCode({ address: tokenAddress });
if (!tokenCode) throw new Error(`No token contract code at ${tokenAddress} on Monad testnet.`);
const decimals = await publicClient.readContract({
  address: tokenAddress,
  abi: [{ type: 'function', name: 'decimals', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] }],
  functionName: 'decimals',
});
if (decimals !== 6) throw new Error(`Expected testnet AUSD to use 6 decimals; token reports ${decimals}.`);

const artifactPath = resolve('artifacts/contracts/SavingsPockets.sol/SavingsPockets.json');
const artifact = JSON.parse(await readFile(artifactPath, 'utf8')) as { abi: readonly unknown[]; bytecode: `0x${string}` };
const account = privateKeyToAccount(rawKey as `0x${string}`);
const walletClient = createWalletClient({ account, chain, transport: http(rpcUrl) });
const transactionHash = await walletClient.deployContract({
  abi: artifact.abi as never,
  bytecode: artifact.bytecode,
  args: [tokenAddress],
});
const receipt = await publicClient.waitForTransactionReceipt({ hash: transactionHash, timeout: 120_000 });
if (receipt.status !== 'success' || !receipt.contractAddress) throw new Error('SavingsPockets deployment failed.');

const deployment = {
  chainId: chain.id,
  contractAddress: receipt.contractAddress,
  tokenAddress,
  deployerAddress: account.address,
  transactionHash,
  blockNumber: receipt.blockNumber.toString(),
};
const deploymentDirectory = resolve('deployments');
await mkdir(deploymentDirectory, { recursive: true });
await writeFile(resolve(deploymentDirectory, 'monad-testnet.json'), `${JSON.stringify(deployment, null, 2)}\n`, { flag: 'wx' });
console.log(JSON.stringify(deployment, null, 2));
