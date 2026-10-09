import {
  createPublicClient,
  defineChain,
  formatUnits,
  http,
  isAddress,
  parseUnits,
  type Address,
} from 'viem';
import { WALLET_TOKENS, type WalletToken } from '@/services/tokens';

export const MONAD_TESTNET = {
  chainId: 10143,
  name: 'Monad Testnet',
  rpcUrl: process.env.EXPO_PUBLIC_ALCHEMY_MONAD_RPC_URL?.trim() || 'https://testnet-rpc.monad.xyz',
  factoryAddress: '0x8468587Af422ad440F58a57E955eCA6A970b5375' as Address,
  explorerUrl:
    'https://testnet.monadvision.com/address/0x8468587Af422ad440F58a57E955eCA6A970b5375?tab=Contract',
  ausdAddress: '0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC' as Address,
  usdcAddress: '0x534b2f3A21130d7a60830c2Df862319e593943A3' as Address,
  ctkAddress: '0x7BEb5D9DB0d85cBEa543C04f0dE8c23c2176cd9D' as Address,
};

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
export const AGORA_TESTNET_WHITELISTER = '0x7c10F56d6f04a51376393a1C3670e966863F6BD5' as Address;

const chain = defineChain({
  id: MONAD_TESTNET.chainId,
  name: MONAD_TESTNET.name,
  nativeCurrency: { name: 'Monad', symbol: 'MON', decimals: 18 },
  rpcUrls: { default: { http: [MONAD_TESTNET.rpcUrl] } },
});

const client = createPublicClient({ chain, transport: http(MONAD_TESTNET.rpcUrl) });

const factoryAbi = [
  {
    type: 'function',
    name: 'getPairFromTokens',
    stateMutability: 'view',
    inputs: [
      { name: '_token0', type: 'address' },
      { name: '_token1', type: 'address' },
    ],
    outputs: [{ name: '', type: 'address' }],
  },
] as const;

export const pairAbi = [
  {
    type: 'function',
    name: 'APPROVED_SWAPPER',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    type: 'function',
    name: 'hasRole',
    stateMutability: 'view',
    inputs: [{ name: '_role', type: 'string' }, { name: '_account', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'isPaused',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'token0',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    type: 'function',
    name: 'token1',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    type: 'function',
    name: 'token0Decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'token1Decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'getAmountsOut',
    stateMutability: 'view',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'path', type: 'address[]' },
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
  },
  {
    type: 'function',
    name: 'getAmountsIn',
    stateMutability: 'view',
    inputs: [
      { name: 'amountOut', type: 'uint256' },
      { name: 'path', type: 'address[]' },
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
  },
  {
    type: 'function',
    name: 'token0PurchaseFee',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'token1PurchaseFee',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'swapExactTokensForTokens',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'path', type: 'address[]' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
  },
  {
    type: 'function',
    name: 'swapTokensForExactTokens',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'amountOut', type: 'uint256' },
      { name: 'amountInMax', type: 'uint256' },
      { name: 'path', type: 'address[]' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
  },
  {
    type: 'event',
    name: 'Swap',
    anonymous: false,
    inputs: [
      { name: 'sender', type: 'address', indexed: true },
      { name: 'amount0In', type: 'uint256', indexed: false },
      { name: 'amount1In', type: 'uint256', indexed: false },
      { name: 'amount0Out', type: 'uint256', indexed: false },
      { name: 'amount1Out', type: 'uint256', indexed: false },
      { name: 'to', type: 'address', indexed: true },
    ],
  },
] as const;

export const whitelisterAbi = [
  {
    type: 'function',
    name: 'setApprovedSwapper',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'swapper', type: 'address' }],
    outputs: [],
  },
] as const;

export interface SettlementQuote {
  checkedAt: string;
  factoryAddress: Address;
  pairAddress: Address;
  amountIn: string;
  amountInRaw: string;
  amountOut: string;
  amountOutRaw: string;
  quoteMode: 'exact-input' | 'exact-output';
  purchaseFeeRate: string;
  outputDecimals: number;
  inputSymbol: WalletToken;
  outputSymbol: WalletToken;
}

export async function simulateTokenSwap(
  inputSymbol: WalletToken,
  outputSymbol: WalletToken,
  amount: string,
  senderAddress: string,
  quoteMode: 'exact-input' | 'exact-output' = 'exact-input',
): Promise<SettlementQuote> {
  if (inputSymbol === outputSymbol) throw new Error('Choose two different tokens to swap.');
  if (!isAddress(senderAddress, { strict: false })) throw new Error('A valid sender wallet address is required for the testnet call.');
  const input = WALLET_TOKENS[inputSymbol];
  const output = WALLET_TOKENS[outputSymbol];
  let requestedAmount: bigint;
  try {
    requestedAmount = parseUnits(amount, quoteMode === 'exact-input' ? input.decimals : output.decimals);
  } catch {
    throw new Error(`Enter a valid ${quoteMode === 'exact-input' ? inputSymbol : outputSymbol} amount with the supported decimal places.`);
  }
  if (requestedAmount <= 0n) throw new Error('Enter an amount greater than zero.');

  try {
    const pairAddress = await client.readContract({
      address: MONAD_TESTNET.factoryAddress,
      abi: factoryAbi,
      functionName: 'getPairFromTokens',
      args: [input.address, output.address],
      account: senderAddress as Address,
    });
    if (pairAddress.toLowerCase() === ZERO_ADDRESS.toLowerCase()) throw new Error(`The factory did not find a ${inputSymbol}/${outputSymbol} pair on Monad testnet.`);
    const [token0, token1, decimals0, decimals1, paused, token0PurchaseFee, token1PurchaseFee] = await Promise.all([
      client.readContract({ address: pairAddress, abi: pairAbi, functionName: 'token0' }),
      client.readContract({ address: pairAddress, abi: pairAbi, functionName: 'token1' }),
      client.readContract({ address: pairAddress, abi: pairAbi, functionName: 'token0Decimals' }),
      client.readContract({ address: pairAddress, abi: pairAbi, functionName: 'token1Decimals' }),
      client.readContract({ address: pairAddress, abi: pairAbi, functionName: 'isPaused' }),
      client.readContract({ address: pairAddress, abi: pairAbi, functionName: 'token0PurchaseFee' }),
      client.readContract({ address: pairAddress, abi: pairAbi, functionName: 'token1PurchaseFee' }),
    ]);
    if (paused) throw new Error('The selected swap pair is paused on Monad testnet.');
    const inputIsToken0 = token0.toLowerCase() === input.address.toLowerCase();
    const outputIsToken0 = token0.toLowerCase() === output.address.toLowerCase();
    if ((!inputIsToken0 && token1.toLowerCase() !== input.address.toLowerCase()) || (!outputIsToken0 && token1.toLowerCase() !== output.address.toLowerCase())) {
      throw new Error(`The returned pair does not contain ${inputSymbol} and ${outputSymbol}.`);
    }
    const inputDecimals = Number(inputIsToken0 ? decimals0 : decimals1);
    const outputDecimals = Number(outputIsToken0 ? decimals0 : decimals1);
    if (inputDecimals !== input.decimals || outputDecimals !== output.decimals) throw new Error('The selected pair reports unexpected token decimals.');
    const path = [input.address, output.address] as const;
    const amounts = quoteMode === 'exact-input'
      ? await client.readContract({ address: pairAddress, abi: pairAbi, functionName: 'getAmountsOut', args: [requestedAmount, [...path]], account: senderAddress as Address })
      : await client.readContract({ address: pairAddress, abi: pairAbi, functionName: 'getAmountsIn', args: [requestedAmount, [...path]], account: senderAddress as Address });
    const amountInRaw = quoteMode === 'exact-input' ? requestedAmount : amounts[0];
    const amountOutRaw = quoteMode === 'exact-input' ? amounts[amounts.length - 1] : requestedAmount;
    if (amountInRaw === undefined || amountInRaw <= 0n || amountOutRaw === undefined || amountOutRaw <= 0n) throw new Error('The selected pair returned no quote for this amount.');
    return {
      checkedAt: new Date().toISOString(), factoryAddress: MONAD_TESTNET.factoryAddress, pairAddress,
      amountIn: formatUnits(amountInRaw, inputDecimals), amountInRaw: amountInRaw.toString(),
      amountOut: formatUnits(amountOutRaw, outputDecimals), amountOutRaw: amountOutRaw.toString(), quoteMode,
      purchaseFeeRate: formatUnits(inputIsToken0 ? token0PurchaseFee : token1PurchaseFee, 18),
      inputSymbol, outputSymbol, outputDecimals,
    };
  } catch (error) {
    if (error instanceof Error && /factory|pair|quote|selected|Monad testnet|decimals/.test(error.message)) throw error;
    throw new Error(error instanceof Error ? `Monad testnet quote failed: ${error.message}` : 'Monad testnet quote failed. Check your connection and try again.');
  }
}

/**
 * Executes only eth_call reads: resolve the documented pair and ask it for a
 * live AUSD→CTK quote. This does not call a state-changing swap function.
 */
export async function simulateSettlementSwap(
  amount: string,
  senderAddress: string,
  quoteMode: 'exact-input' | 'exact-output' = 'exact-input',
): Promise<SettlementQuote> {
  return simulateTokenSwap('AUSD', 'CTK', amount, senderAddress, quoteMode);
}
