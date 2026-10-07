import { Platform } from 'react-native';
import Constants, { AppOwnership } from 'expo-constants';
import { HDKey } from '@scure/bip32';
import { entropyToMnemonic, mnemonicToSeedSync } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import { toViemAccount } from '@category-labs/mera/viem';
import { toKernelSmartAccount } from 'permissionless/accounts';
import { createSmartAccountClient } from 'permissionless';
import {
  createPublicClient,
  decodeEventLog,
  defineChain,
  encodeFunctionData,
  formatUnits,
  http,
  isAddress,
  parseUnits,
  type Address,
} from 'viem';
import { entryPoint07Address } from 'viem/account-abstraction';
import { createPaymasterClient } from 'viem/account-abstraction';
import type { PasskeyCredentialMetadata } from '@category-labs/mera';
import {
  AGORA_TESTNET_WHITELISTER,
  MONAD_TESTNET,
  pairAbi,
  simulateSettlementSwap,
  whitelisterAbi,
} from '@/services/settlement';

export interface MeraAccount {
  address: string;
  signerAddress: string;
  credential: PasskeyCredentialMetadata;
  rpId: string;
}

export interface MeraPasskeyProfile {
  address: string;
  signerAddress: string;
  credential: PasskeyCredentialMetadata;
  rpId: string;
}

export const MONAD_CHAIN = defineChain({
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: { name: 'Monad', symbol: 'MON', decimals: 18 },
  rpcUrls: { default: { http: [MONAD_TESTNET.rpcUrl] } },
});

const publicClient = createPublicClient({ chain: MONAD_CHAIN, transport: http(MONAD_TESTNET.rpcUrl) });
const entryPoint = { address: entryPoint07Address, version: '0.7' as const };
const AUSD_ADDRESS = '0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC' as Address;
const ausdAbi = [
  { type: 'function', name: 'decimals', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'allowance', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'approve', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'transfer', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
] as const;

export function getPasskeyErrorMessage(error: unknown) {
  if (!(error instanceof Error)) return 'Passkey authentication did not complete. Please try again.';
  const shaped = error as Error & { code?: string; cause?: unknown };
  const cause = shaped.cause as { error?: unknown; message?: unknown; code?: unknown } | undefined;
  const causeText = [cause?.error, cause?.message, cause?.code]
    .filter((part): part is string => typeof part === 'string')
    .join(' ')
    .toLowerCase();

  if (shaped.code === 'PRF_UNAVAILABLE') {
    return 'This passkey provider does not support the secure account feature Mera needs. Try a device passkey or another authenticator.';
  }
  if (shaped.code === 'CRYPTO_UNAVAILABLE') {
    return 'Secure cryptography is unavailable in this app runtime. Update the app and try again.';
  }
  if (causeText.includes('cancel')) {
    return 'Passkey prompt cancelled. You can try again when you’re ready.';
  }
  return error.message || 'Passkey authentication did not complete. Please try again.';
}

function getRelyingPartyId() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.location.hostname;
  }
  const configured = process.env.EXPO_PUBLIC_RP_ID || process.env.EXPO_PUBLIC_DOMAIN;
  if (!configured) return undefined;
  try {
    return new URL(configured.includes('://') ? configured : `https://${configured}`).hostname;
  } catch {
    return undefined;
  }
}

async function assertPlatformSupport() {
  if (Platform.OS !== 'web' && Constants.appOwnership === AppOwnership.Expo) {
    throw new Error(
      'Expo Go does not include Mera’s native passkey module. Install the AUSD development build, then open this project with the dev:client command.',
    );
  }
  if (Platform.OS === 'ios' && Number(Platform.Version) < 18) {
    throw new Error('Mera passkey accounts require iOS 18 or later.');
  }
  if (Platform.OS === 'android' && Number(Platform.Version) < 28) {
    throw new Error('Mera passkey accounts require Android 9 or later.');
  }
  if (Platform.OS !== 'web') {
    const { Passkey } = await import('react-native-passkey');
    if (!Passkey.isSupported()) {
      throw new Error('Passkeys are not available on this device. Try a supported device with a screen lock enabled.');
    }
  }
  if (Platform.OS === 'web' && typeof window !== 'undefined' && !window.PublicKeyCredential) {
    throw new Error('This browser does not support passkeys. Try a supported browser.');
  }
}

async function getNativeWebAuthnClient() {
  return Platform.OS === 'web'
    ? undefined
    : (await import('@category-labs/mera/react-native-webauthn-client'))
        .reactNativeWebAuthnClient;
}

function signerFromPrf(mera: typeof import('@category-labs/mera'), prfOutput: Uint8Array) {
  let session: ReturnType<typeof mera.createSecp256k1SigningSession> | undefined;
  let seed: Uint8Array | undefined;
  let privateKey: Uint8Array | undefined;
  try {
    const mnemonic = entropyToMnemonic(prfOutput, wordlist);
    seed = mnemonicToSeedSync(mnemonic);
    const node = HDKey.fromMasterSeed(seed).derive("m/44'/60'/0'/0/0");
    if (!node.privateKey) throw new Error('Mera could not derive the EVM account key.');
    privateKey = node.privateKey;
    session = mera.createSecp256k1SigningSession({ privateKey });
    return { session, owner: toViemAccount(session) };
  } catch (error) {
    session?.end();
    throw error;
  } finally {
    privateKey?.fill(0);
    seed?.fill(0);
    prfOutput.fill(0);
  }
}

async function createKernelAccount(owner: ReturnType<typeof toViemAccount>) {
  return toKernelSmartAccount({
    client: publicClient,
    entryPoint,
    owners: [owner],
    version: '0.3.1',
  });
}

export async function createMeraPasskey(name: string, email: string): Promise<MeraAccount> {
  await assertPlatformSupport();
  const rpId = getRelyingPartyId();
  if (!rpId) {
    throw new Error(
      'Passkey setup needs a verified HTTPS domain. Configure EXPO_PUBLIC_RP_ID and publish the iOS and Android domain association files for that domain.',
    );
  }

  const mera = await import('@category-labs/mera');
  const webAuthnClient = await getNativeWebAuthnClient();
  const created = await mera.createPasskeyWithPrfOutput({
    rp: { id: rpId, name: 'AUSD Wallet' },
    user: { name: email, displayName: name },
    ...(webAuthnClient ? { webAuthnClient } : {}),
  });

  const signer = signerFromPrf(mera, created.prfOutput);
  try {
    const kernelAccount = await createKernelAccount(signer.owner);
    return {
      address: kernelAccount.address,
      signerAddress: signer.owner.address,
      rpId,
      credential: {
        credentialId: created.credentialId,
        ...(created.transports ? { transports: [...created.transports] } : {}),
      },
    };
  } finally {
    signer.session.end();
  }
}

export async function getMeraViemSigner(account: MeraPasskeyProfile) {
  await assertPlatformSupport();
  const mera = await import('@category-labs/mera');
  const webAuthnClient = await getNativeWebAuthnClient();
  const { prfOutput } = await mera.getPasskeyPrfOutput({
    rpId: account.rpId,
    credential: account.credential,
    ...(webAuthnClient ? { webAuthnClient } : {}),
  });
  const signer = signerFromPrf(mera, prfOutput);
  if (signer.owner.address.toLowerCase() !== account.signerAddress.toLowerCase()) {
    signer.session.end();
    throw new Error('This passkey does not match the wallet saved on this device.');
  }
  return signer;
}

export async function authenticateMeraPasskey(account: MeraPasskeyProfile): Promise<string> {
  const signer = await getMeraViemSigner(account);
  try {
    const kernelAccount = await createKernelAccount(signer.owner);
    if (kernelAccount.address.toLowerCase() !== account.address.toLowerCase()) {
      throw new Error('This passkey smart account does not match the wallet saved on this device.');
    }
    return signer.owner.address;
  } finally {
    signer.session.end();
  }
}

export async function getAUSDBalance(account: string) {
  if (!isAddress(account, { strict: false })) throw new Error('Invalid Monad wallet address.');
  const [decimals, rawBalance] = await Promise.all([
    publicClient.readContract({ address: AUSD_ADDRESS, abi: ausdAbi, functionName: 'decimals' }),
    publicClient.readContract({ address: AUSD_ADDRESS, abi: ausdAbi, functionName: 'balanceOf', args: [account as Address] }),
  ]);
  if (decimals !== 6) throw new Error(`Monad AUSD reports ${decimals} decimals; expected 6.`);
  return formatUnits(rawBalance, decimals);
}

export interface SponsoredTransferResult {
  transactionHash: `0x${string}`;
  accountAddress: Address;
  blockNumber: bigint;
}

export interface SponsoredSettlementResult extends SponsoredTransferResult {
  pairAddress: Address;
  amountOut: string;
  outputSymbol: 'CTK';
}

export async function sendSponsoredAUSDTransfer(
  account: MeraPasskeyProfile,
  recipient: string,
  amount: string,
): Promise<SponsoredTransferResult> {
  if (!isAddress(recipient, { strict: false })) throw new Error('Enter a valid recipient wallet address.');
  if (recipient.toLowerCase() === account.address.toLowerCase()) throw new Error('Choose a recipient other than your own wallet.');
  const bundlerUrl = process.env.EXPO_PUBLIC_PIMLICO_BUNDLER_URL?.trim();
  if (!bundlerUrl) throw new Error('Pimlico is not configured. Set EXPO_PUBLIC_PIMLICO_BUNDLER_URL and rebuild or restart the app.');
  if (!/^https:\/\//i.test(bundlerUrl)) throw new Error('The Pimlico bundler URL must use HTTPS.');

  let amountIn: bigint;
  try {
    amountIn = parseUnits(amount, 6);
  } catch {
    throw new Error('Enter a valid AUSD amount with at most six decimal places.');
  }
  if (amountIn <= 0n) throw new Error('Enter an AUSD amount greater than zero.');

  const signer = await getMeraViemSigner(account);
  try {
    const kernelAccount = await createKernelAccount(signer.owner);
    if (kernelAccount.address.toLowerCase() !== account.address.toLowerCase()) {
      throw new Error('The passkey-derived smart account changed. Stop and restore the matching wallet before sending.');
    }
    const [decimals, balance] = await Promise.all([
      publicClient.readContract({ address: AUSD_ADDRESS, abi: ausdAbi, functionName: 'decimals' }),
      publicClient.readContract({ address: AUSD_ADDRESS, abi: ausdAbi, functionName: 'balanceOf', args: [kernelAccount.address] }),
    ]);
    if (decimals !== 6) throw new Error(`Monad AUSD reports ${decimals} decimals; expected 6.`);
    if (balance < amountIn) throw new Error(`Insufficient AUSD balance. This smart account holds ${formatUnits(balance, decimals)} AUSD.`);

    const pimlicoClient = createPaymasterClient({ transport: http(bundlerUrl) });
    const sponsorshipPolicyId = process.env.EXPO_PUBLIC_PIMLICO_POLICY_ID?.trim();
    const smartAccountClient = createSmartAccountClient({
      account: kernelAccount,
      chain: MONAD_CHAIN,
      client: publicClient,
      bundlerTransport: http(bundlerUrl),
      paymaster: pimlicoClient,
      ...(sponsorshipPolicyId ? { paymasterContext: { sponsorshipPolicyId } } : {}),
    });

    const transactionHash = await smartAccountClient.sendTransaction({
      to: AUSD_ADDRESS,
      data: encodeFunctionData({
        abi: ausdAbi,
        functionName: 'transfer',
        args: [recipient as Address, amountIn],
      }),
      value: 0n,
      ...(sponsorshipPolicyId ? { paymasterContext: { sponsorshipPolicyId } } : {}),
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash: transactionHash, timeout: 120_000 });
    if (receipt.status !== 'success') throw new Error('The sponsored AUSD transfer reverted on Monad testnet.');
    return { transactionHash, accountAddress: kernelAccount.address, blockNumber: receipt.blockNumber };
  } finally {
    signer.session.end();
  }
}

export async function sendSponsoredInstantSettlementSwap(
  account: MeraPasskeyProfile,
  recipient: string,
  amount: string,
  acceptedQuote: { pairAddress: string; amountOutRaw: string; checkedAt: string },
): Promise<SponsoredSettlementResult> {
  if (!isAddress(recipient, { strict: false })) throw new Error('Enter a valid recipient wallet address.');
  if (recipient.toLowerCase() === account.address.toLowerCase()) throw new Error('Choose a recipient other than your own wallet.');
  if (!isAddress(acceptedQuote.pairAddress, { strict: false })) throw new Error('The reviewed Agora pair address is invalid.');
  if (!/^\d+$/.test(acceptedQuote.amountOutRaw) || BigInt(acceptedQuote.amountOutRaw) <= 0n) {
    throw new Error('The reviewed CTK quote is invalid. Return to the send form and refresh it.');
  }
  const quoteTime = Date.parse(acceptedQuote.checkedAt);
  if (!Number.isFinite(quoteTime) || Date.now() - quoteTime > 5 * 60_000) {
    throw new Error('This Agora quote has expired. Return to the send form and get a fresh quote.');
  }
  const bundlerUrl = process.env.EXPO_PUBLIC_PIMLICO_BUNDLER_URL?.trim();
  if (!bundlerUrl) throw new Error('Pimlico is not configured. Set EXPO_PUBLIC_PIMLICO_BUNDLER_URL and rebuild or restart the app.');
  if (!/^https:\/\//i.test(bundlerUrl)) throw new Error('The Pimlico bundler URL must use HTTPS.');

  let amountIn: bigint;
  try { amountIn = parseUnits(amount, 6); }
  catch { throw new Error('Enter a valid AUSD amount with at most six decimal places.'); }
  if (amountIn <= 0n) throw new Error('Enter an AUSD amount greater than zero.');

  const signer = await getMeraViemSigner(account);
  try {
    const kernelAccount = await createKernelAccount(signer.owner);
    if (kernelAccount.address.toLowerCase() !== account.address.toLowerCase()) {
      throw new Error('The passkey-derived smart account changed. Stop and restore the matching wallet before sending.');
    }

    // Requote immediately before signing. The exact amount shown in review is
    // the minimum output; a worse quote requires the user to review again.
    const freshQuote = await simulateSettlementSwap(amount, kernelAccount.address);
    if (freshQuote.pairAddress.toLowerCase() !== acceptedQuote.pairAddress.toLowerCase() ||
        BigInt(freshQuote.amountOutRaw) < BigInt(acceptedQuote.amountOutRaw)) {
      throw new Error('The Agora quote changed. Return to the send form and review the updated payout.');
    }
    const pairAddress = freshQuote.pairAddress;
    const [decimals, balance, approved, allowance, token0, token1, whitelisterCode] = await Promise.all([
      publicClient.readContract({ address: AUSD_ADDRESS, abi: ausdAbi, functionName: 'decimals' }),
      publicClient.readContract({ address: AUSD_ADDRESS, abi: ausdAbi, functionName: 'balanceOf', args: [kernelAccount.address] }),
      publicClient.readContract({ address: pairAddress, abi: pairAbi, functionName: 'hasRole', args: ['APPROVED_SWAPPER', kernelAccount.address] }),
      publicClient.readContract({ address: AUSD_ADDRESS, abi: ausdAbi, functionName: 'allowance', args: [kernelAccount.address, pairAddress] }),
      publicClient.readContract({ address: pairAddress, abi: pairAbi, functionName: 'token0' }),
      publicClient.readContract({ address: pairAddress, abi: pairAbi, functionName: 'token1' }),
      publicClient.getBytecode({ address: AGORA_TESTNET_WHITELISTER }),
    ]);
    if (decimals !== 6) throw new Error(`Monad AUSD reports ${decimals} decimals; expected 6.`);
    if (balance < amountIn) throw new Error(`Insufficient AUSD balance. This smart account holds ${formatUnits(balance, decimals)} AUSD.`);
    if (!whitelisterCode || whitelisterCode === '0x') throw new Error('Agora’s Monad testnet whitelister is not deployed at the documented address.');
    if (token0.toLowerCase() !== MONAD_TESTNET.ctkAddress.toLowerCase() ||
        token1.toLowerCase() !== MONAD_TESTNET.ausdAddress.toLowerCase()) {
      throw new Error('The Agora pair token order changed. Return to the send form and request a new quote.');
    }

    const calls: { to: Address; value: bigint; data: `0x${string}` }[] = [];
    if (!approved) {
      calls.push({
        to: AGORA_TESTNET_WHITELISTER,
        value: 0n,
        data: encodeFunctionData({ abi: whitelisterAbi, functionName: 'setApprovedSwapper', args: [kernelAccount.address] }),
      });
    }
    if (allowance < amountIn) {
      calls.push({
        to: AUSD_ADDRESS,
        value: 0n,
        data: encodeFunctionData({ abi: ausdAbi, functionName: 'approve', args: [pairAddress, amountIn] }),
      });
    }
    calls.push({
      to: pairAddress,
      value: 0n,
      data: encodeFunctionData({
        abi: pairAbi,
        functionName: 'swapExactTokensForTokens',
        args: [
          amountIn,
          BigInt(acceptedQuote.amountOutRaw),
          [MONAD_TESTNET.ausdAddress, MONAD_TESTNET.ctkAddress],
          recipient as Address,
          BigInt(Math.floor(Date.now() / 1000) + 300),
        ],
      }),
    });

    const pimlicoClient = createPaymasterClient({ transport: http(bundlerUrl) });
    const sponsorshipPolicyId = process.env.EXPO_PUBLIC_PIMLICO_POLICY_ID?.trim();
    const smartAccountClient = createSmartAccountClient({
      account: kernelAccount,
      chain: MONAD_CHAIN,
      client: publicClient,
      bundlerTransport: http(bundlerUrl),
      paymaster: pimlicoClient,
      ...(sponsorshipPolicyId ? { paymasterContext: { sponsorshipPolicyId } } : {}),
    });
    const transactionHash = await smartAccountClient.sendTransaction({
      calls,
      ...(sponsorshipPolicyId ? { paymasterContext: { sponsorshipPolicyId } } : {}),
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash: transactionHash, timeout: 120_000 });
    if (receipt.status !== 'success') throw new Error('The sponsored Agora settlement reverted on Monad testnet.');

    let amountOut: bigint | undefined;
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== pairAddress.toLowerCase()) continue;
      try {
        const event = decodeEventLog({ abi: pairAbi, eventName: 'Swap', data: log.data, topics: log.topics });
        if (event.args.to.toLowerCase() !== recipient.toLowerCase()) continue;
        amountOut = event.args.amount0Out;
        break;
      } catch {
        // Other pair events in the same transaction are ignored.
      }
    }
    if (amountOut === undefined || amountOut < BigInt(acceptedQuote.amountOutRaw)) {
      throw new Error('The transaction was included, but the expected recipient payout could not be verified from the Agora swap event.');
    }
    return {
      transactionHash,
      accountAddress: kernelAccount.address,
      blockNumber: receipt.blockNumber,
      pairAddress,
      amountOut: formatUnits(amountOut, freshQuote.outputDecimals),
      outputSymbol: 'CTK',
    };
  } finally {
    signer.session.end();
  }
}
