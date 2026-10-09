import {
  createPublicClient,
  encodeFunctionData,
  encodePacked,
  formatUnits,
  http,
  isAddress,
  keccak256,
  parseUnits,
  type Address,
  type Hex,
} from 'viem';
import { MONAD_TESTNET } from '@/services/settlement';
import {
  MONAD_CHAIN,
  sendSponsoredCalls,
  type MeraPasskeyProfile,
  type SponsoredCall,
} from '@/services/passkey';

export const SAVINGS_POCKETS_ADDRESS =
  '0xff17b04d8d71698295586678f6a6b7452587cf14' as Address;

const BPS_DENOMINATOR = 10_000n;
const publicClient = createPublicClient({
  chain: MONAD_CHAIN,
  transport: http(MONAD_TESTNET.rpcUrl),
});

const tokenAbi = [
  {
    type: 'function',
    name: 'decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint8' }],
  },
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'allowance',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
] as const;

const pocketsAbi = [
  {
    type: 'function',
    name: 'token',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'function',
    name: 'createPocket',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'pocketId', type: 'bytes32' },
      { name: 'autoSaveBps', type: 'uint16' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'getPocket',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'pocketId', type: 'bytes32' },
    ],
    outputs: [
      { name: 'balance', type: 'uint256' },
      { name: 'autoSaveBps', type: 'uint16' },
      { name: 'exists', type: 'bool' },
    ],
  },
  {
    type: 'function',
    name: 'deposit',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'pocketId', type: 'bytes32' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'payWithAutoSave',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'pocketId', type: 'bytes32' },
      { name: 'recipient', type: 'address' },
      { name: 'paymentAmount', type: 'uint256' },
    ],
    outputs: [{ name: 'savedAmount', type: 'uint256' }],
  },
] as const;

export interface SavingsPocketState {
  pocketId: Hex;
  balance: string;
  autoSaveBps: number;
  exists: boolean;
}

export interface AutoSaveBreakdown {
  paymentAmount: string;
  savedAmount: string;
  totalDebit: string;
}

function assertPocketId(pocketId: string): asserts pocketId is Hex {
  if (!/^0x[0-9a-fA-F]{64}$/.test(pocketId)) {
    throw new Error('This savings goal does not have a valid on-chain pocket ID.');
  }
}

async function assertSavingsContract() {
  const code = await publicClient.getBytecode({ address: SAVINGS_POCKETS_ADDRESS });
  if (!code || code === '0x') {
    throw new Error('The SavingsPockets contract is not deployed at its configured Monad testnet address.');
  }
  const [token, decimals] = await Promise.all([
    publicClient.readContract({
      address: SAVINGS_POCKETS_ADDRESS,
      abi: pocketsAbi,
      functionName: 'token',
    }),
    publicClient.readContract({
      address: MONAD_TESTNET.ausdAddress,
      abi: tokenAbi,
      functionName: 'decimals',
    }),
  ]);
  if (token.toLowerCase() !== MONAD_TESTNET.ausdAddress.toLowerCase()) {
    throw new Error('The deployed savings contract is configured for a different token.');
  }
  if (decimals !== 6) {
    throw new Error(`Monad testnet AUSD reports ${decimals} decimals; expected 6.`);
  }
}

export function createSavingsPocketId(owner: string, goalId: string): Hex {
  if (!isAddress(owner, { strict: false })) {
    throw new Error('A valid Mera smart-account address is required to create a savings pocket.');
  }
  return keccak256(
    encodePacked(
      ['string', 'address', 'string'],
      ['AUSD_SAVINGS_POCKET_V1', owner as Address, goalId],
    ),
  );
}

export async function getSavingsPocket(
  owner: string,
  pocketId: string,
): Promise<SavingsPocketState> {
  if (!isAddress(owner, { strict: false })) throw new Error('The savings pocket owner address is invalid.');
  assertPocketId(pocketId);
  await assertSavingsContract();
  const [rawBalance, autoSaveBps, exists] = await publicClient.readContract({
    address: SAVINGS_POCKETS_ADDRESS,
    abi: pocketsAbi,
    functionName: 'getPocket',
    args: [owner as Address, pocketId],
  });
  return {
    pocketId,
    balance: formatUnits(rawBalance, 6),
    autoSaveBps: Number(autoSaveBps),
    exists,
  };
}

export async function createSponsoredSavingsPocket(
  account: MeraPasskeyProfile,
  pocketId: string,
  autoSaveBps: number,
) {
  assertPocketId(pocketId);
  if (!Number.isInteger(autoSaveBps) || autoSaveBps < 0 || autoSaveBps > 10_000) {
    throw new Error('Choose an auto-save rate from 0% to 100%.');
  }
  await assertSavingsContract();
  const existing = await getSavingsPocket(account.address, pocketId);
  if (existing.exists) {
    if (existing.autoSaveBps !== autoSaveBps) {
      throw new Error(`This pocket already exists with an ${existing.autoSaveBps / 100}% rate. No transaction was sent.`);
    }
    return { alreadyCreated: true as const };
  }
  const data = encodeFunctionData({
    abi: pocketsAbi,
    functionName: 'createPocket',
    args: [pocketId, autoSaveBps],
  });
  const result = await sendSponsoredCalls(account, [
    { to: SAVINGS_POCKETS_ADDRESS, data },
  ]);
  return { alreadyCreated: false as const, ...result };
}

export function calculateAutoSaveBreakdown(
  paymentAmount: string,
  autoSaveBps: number,
): AutoSaveBreakdown {
  if (!Number.isInteger(autoSaveBps) || autoSaveBps < 0 || autoSaveBps > 10_000) {
    throw new Error('The pocket auto-save rate is invalid.');
  }
  let paymentRaw: bigint;
  try {
    paymentRaw = parseUnits(paymentAmount, 6);
  } catch {
    throw new Error('Enter a valid AUSD payment with at most six decimal places.');
  }
  if (paymentRaw <= 0n) throw new Error('Enter an AUSD payment greater than zero.');
  const savedRaw = (paymentRaw * BigInt(autoSaveBps)) / BPS_DENOMINATOR;
  return {
    paymentAmount: formatUnits(paymentRaw, 6),
    savedAmount: formatUnits(savedRaw, 6),
    totalDebit: formatUnits(paymentRaw + savedRaw, 6),
  };
}

async function getAllowanceCalls(
  owner: Address,
  totalDebit: bigint,
): Promise<SponsoredCall[]> {
  const allowance = await publicClient.readContract({
    address: MONAD_TESTNET.ausdAddress,
    abi: tokenAbi,
    functionName: 'allowance',
    args: [owner, SAVINGS_POCKETS_ADDRESS],
  });
  if (allowance >= totalDebit) return [];
  return [{
    to: MONAD_TESTNET.ausdAddress,
    data: encodeFunctionData({
      abi: tokenAbi,
      functionName: 'approve',
      args: [SAVINGS_POCKETS_ADDRESS, totalDebit],
    }),
  }];
}

export async function depositToSavingsPocket(
  account: MeraPasskeyProfile,
  pocketId: string,
  amount: string,
) {
  assertPocketId(pocketId);
  await assertSavingsContract();
  const pocket = await getSavingsPocket(account.address, pocketId);
  if (!pocket.exists) throw new Error('Activate this savings pocket on Monad before depositing.');
  let amountRaw: bigint;
  try {
    amountRaw = parseUnits(amount, 6);
  } catch {
    throw new Error('Enter a valid AUSD deposit with at most six decimal places.');
  }
  if (amountRaw <= 0n) throw new Error('Enter a deposit amount greater than zero.');
  const walletBalance = await publicClient.readContract({
    address: MONAD_TESTNET.ausdAddress,
    abi: tokenAbi,
    functionName: 'balanceOf',
    args: [account.address as Address],
  });
  if (walletBalance < amountRaw) throw new Error(`Your smart account has ${formatUnits(walletBalance, 6)} AUSD available.`);

  const calls = await getAllowanceCalls(account.address as Address, amountRaw);
  calls.push({
    to: SAVINGS_POCKETS_ADDRESS,
    data: encodeFunctionData({
      abi: pocketsAbi,
      functionName: 'deposit',
      args: [pocketId, amountRaw],
    }),
  });
  const result = await sendSponsoredCalls(account, calls);
  return {
    ...result,
    amount: formatUnits(amountRaw, 6),
    pocket: {
      pocketId,
      balance: formatUnits(parseUnits(pocket.balance, 6) + amountRaw, 6),
      autoSaveBps: pocket.autoSaveBps,
      exists: true,
    },
  };
}

export async function payWithAutoSaveSponsored(
  account: MeraPasskeyProfile,
  recipient: string,
  pocketId: string,
  expectedRateBps: number,
  paymentAmount: string,
) {
  if (!isAddress(recipient, { strict: false })) throw new Error('Enter a valid recipient wallet address.');
  if (recipient.toLowerCase() === account.address.toLowerCase()) {
    throw new Error('Choose a recipient other than your own smart account.');
  }
  assertPocketId(pocketId);
  if (!Number.isInteger(expectedRateBps) || expectedRateBps <= 0 || expectedRateBps > 10_000) {
    throw new Error('Choose an active pocket with an auto-save rate above 0%.');
  }
  const breakdown = calculateAutoSaveBreakdown(paymentAmount, expectedRateBps);
  await assertSavingsContract();
  const pocket = await getSavingsPocket(account.address, pocketId);
  if (!pocket.exists) throw new Error('This goal pocket is not active on Monad. Return to Savings Goals and activate it.');
  if (pocket.autoSaveBps !== expectedRateBps) {
    throw new Error('The pocket rate changed since review. Return and review the updated auto-save amount.');
  }
  const paymentRaw = parseUnits(breakdown.paymentAmount, 6);
  const savedRaw = parseUnits(breakdown.savedAmount, 6);
  const totalRaw = paymentRaw + savedRaw;
  const walletBalance = await publicClient.readContract({
    address: MONAD_TESTNET.ausdAddress,
    abi: tokenAbi,
    functionName: 'balanceOf',
    args: [account.address as Address],
  });
  if (walletBalance < totalRaw) {
    throw new Error(`You need ${breakdown.totalDebit} AUSD for the payment and savings allocation; the account has ${formatUnits(walletBalance, 6)} AUSD.`);
  }
  const calls = await getAllowanceCalls(account.address as Address, totalRaw);
  calls.push({
    to: SAVINGS_POCKETS_ADDRESS,
    data: encodeFunctionData({
      abi: pocketsAbi,
      functionName: 'payWithAutoSave',
      args: [pocketId, recipient as Address, paymentRaw],
    }),
  });
  const result = await sendSponsoredCalls(account, calls);
  return {
    ...result,
    ...breakdown,
    pocket: {
      pocketId,
      balance: formatUnits(parseUnits(pocket.balance, 6) + savedRaw, 6),
      autoSaveBps: pocket.autoSaveBps,
      exists: true,
    },
  };
}
