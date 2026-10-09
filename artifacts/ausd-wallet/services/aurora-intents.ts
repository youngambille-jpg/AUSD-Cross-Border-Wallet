const API_BASE = 'https://intents-api.aurora.dev/api';
const API_KEY = process.env.EXPO_PUBLIC_AURORA_INTENTS_API_KEY?.trim();

export interface AuroraAsset {
  assetId: string;
  decimals: number;
  blockchain: string;
  symbol: string;
  price?: number;
  contractAddress?: string | null;
}

export interface AuroraQuote {
  timestamp: string;
  signature: string;
  quoteRequest: Record<string, unknown>;
  quote: {
    depositAddress: string;
    depositMemo?: string | null;
    deadline?: string;
    timeWhenInactive?: string;
    amountInFormatted?: string;
    amountOutFormatted?: string;
    amountOutUsd?: string;
    minAmountOut?: string;
    timeEstimate?: number;
  };
}

export interface AuroraTransaction {
  depositAddress: string;
  status: 'KNOWN_DEPOSIT_TX' | 'PENDING_DEPOSIT' | 'INCOMPLETE_DEPOSIT' | 'PROCESSING' | 'SUCCESS' | 'REFUNDED' | 'FAILED';
  createdAt: string;
  amountInFormatted: string;
  amountOutFormatted: string;
  originChainTxHashes: string[];
  destinationChainTxHashes: string[];
  refundReason?: string | null;
}

function requireKey() {
  if (!API_KEY) throw new Error('Aurora Intents is not configured. Add EXPO_PUBLIC_AURORA_INTENTS_API_KEY and restart the app.');
  return API_KEY;
}

async function readResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => null) as ({ message?: string; error?: string } | null);
  if (!response.ok) {
    const message = data?.message || data?.error || `Aurora Intents request failed (${response.status}).`;
    throw new Error(message);
  }
  return data as T;
}

export async function getAuroraAssets(): Promise<AuroraAsset[]> {
  const response = await fetch(`${API_BASE}/tokens/${encodeURIComponent(requireKey())}`);
  const data = await readResponse<unknown>(response);
  const assets = Array.isArray(data) ? data : (data as { data?: unknown[] } | null)?.data;
  if (!Array.isArray(assets)) throw new Error('Aurora returned an unexpected token list.');
  return assets.filter((asset): asset is AuroraAsset => {
    if (typeof asset !== 'object' || asset === null) return false;
    const token = asset as Partial<AuroraAsset>;
    return typeof token.assetId === 'string' && typeof token.symbol === 'string' &&
      typeof token.blockchain === 'string' && Number.isInteger(token.decimals);
  });
}

function toSmallestUnit(amount: string, decimals: number): string {
  if (!/^\d+(\.\d+)?$/.test(amount)) throw new Error('Enter a valid deposit amount.');
  const [whole, fraction = ''] = amount.split('.');
  if (fraction.length > decimals) throw new Error(`This token supports up to ${decimals} decimal places.`);
  return (BigInt(whole) * (10n ** BigInt(decimals)) + BigInt((fraction + '0'.repeat(decimals)).slice(0, decimals) || '0')).toString();
}

export async function requestAuroraDepositQuote(input: {
  sourceAsset: AuroraAsset;
  destinationAsset: AuroraAsset;
  amount: string;
  recipient: string;
  refundTo: string;
}): Promise<AuroraQuote> {
  const amount = toSmallestUnit(input.amount, input.sourceAsset.decimals);
  const response = await fetch(`${API_BASE}/quote/${encodeURIComponent(requireKey())}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      dry: false,
      swapType: 'EXACT_INPUT',
      slippageTolerance: 100,
      originAsset: input.sourceAsset.assetId,
      depositType: 'ORIGIN_CHAIN',
      destinationAsset: input.destinationAsset.assetId,
      amount,
      recipient: input.recipient,
      recipientType: 'DESTINATION_CHAIN',
      refundTo: input.refundTo,
      refundType: 'ORIGIN_CHAIN',
      deadline: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    }),
  });
  const quote = await readResponse<AuroraQuote>(response);
  if (!quote?.quote?.depositAddress) throw new Error('Aurora did not return a deposit address for this route.');
  return quote;
}

export async function getAuroraDepositStatus(walletAddress: string, depositAddress: string): Promise<AuroraTransaction | null> {
  const params = new URLSearchParams({ walletAddress, numberOfTransactions: '100' });
  const response = await fetch(`${API_BASE}/transactions/${encodeURIComponent(requireKey())}?${params.toString()}`);
  const data = await readResponse<unknown>(response);
  const transactions = Array.isArray(data) ? data : (data as { data?: unknown[] } | null)?.data;
  if (!Array.isArray(transactions)) throw new Error('Aurora returned an unexpected transaction history.');
  return transactions.find((item): item is AuroraTransaction =>
    typeof item === 'object' && item !== null &&
    (item as Partial<AuroraTransaction>).depositAddress?.toLowerCase() === depositAddress.toLowerCase()) ?? null;
}

export function getAuroraApiKeyConfigured() {
  return Boolean(API_KEY);
}
