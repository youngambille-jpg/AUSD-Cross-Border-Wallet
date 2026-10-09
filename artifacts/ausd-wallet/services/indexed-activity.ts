import { useEffect, useState } from 'react';
import { formatUnits } from 'viem';

const GRAPHQL_URL = process.env.EXPO_PUBLIC_ENVIO_GRAPHQL_URL?.trim();
const AUSD_ADDRESS = '0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC'.toLowerCase();
const CTK_ADDRESS = '0x7BEb5D9DB0d85cBEa543C04f0dE8c23c2176cd9D'.toLowerCase();
const USDC_ADDRESS = '0x534b2f3A21130d7a60830c2Df862319e593943A3'.toLowerCase();

export interface IndexedTransfer {
  id: string;
  token: string;
  from: string;
  to: string;
  value: string;
  transactionHash: string;
  blockNumber: string;
  timestamp: string;
}

export interface IndexedSavingsActivity {
  id: string;
  kind: string;
  owner: string;
  pocketId?: string | null;
  counterparty?: string | null;
  amount?: string | null;
  paymentAmount?: string | null;
  savedAmount?: string | null;
  autoSaveBps?: number | null;
  transactionHash: string;
  blockNumber: string;
  timestamp: string;
}

interface GraphQLResponse {
  data?: { TokenTransfer?: IndexedTransfer[]; SavingsActivity?: IndexedSavingsActivity[] };
  errors?: Array<{ message: string }>;
}

const transfersQuery = `query WalletTransfers($account: String!) {
  TokenTransfer(where: { from: { _eq: $account } }, order_by: { blockNumber: desc }, limit: 50) {
    id token from to value transactionHash blockNumber timestamp
  }
}`;

const receivedQuery = `query WalletReceipts($account: String!) {
  TokenTransfer(where: { to: { _eq: $account } }, order_by: { blockNumber: desc }, limit: 50) {
    id token from to value transactionHash blockNumber timestamp
  }
}`;

const savingsQuery = `query WalletSavingsActivity($account: String!) {
  SavingsActivity(where: { _or: [{ owner: { _eq: $account } }, { counterparty: { _eq: $account } }] }, order_by: { blockNumber: desc }, limit: 100) {
    id kind owner pocketId counterparty amount paymentAmount savedAmount autoSaveBps transactionHash blockNumber timestamp
  }
}`;

async function fetchGraphql<T>(account: string, query: string, field: 'TokenTransfer' | 'SavingsActivity'): Promise<T[]> {
  if (!GRAPHQL_URL) return [];
  const response = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: { account: account.toLowerCase() } }),
  });
  if (!response.ok) throw new Error(`Activity service returned ${response.status}.`);
  const result = await response.json() as GraphQLResponse;
  if (result.errors?.length) throw new Error(result.errors[0]?.message ?? 'Activity query failed.');
  return (result.data?.[field] ?? []) as T[];
}

export function useIndexedActivity(account?: string) {
  const [transfers, setTransfers] = useState<IndexedTransfer[]>([]);
  const [savings, setSavings] = useState<IndexedSavingsActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!GRAPHQL_URL || !account) {
    setTransfers([]); setSavings([]);
      setLoading(false);
      setError('');
      return;
    }
    let active = true;
    setLoading(true);
    setError('');
    Promise.all([
      fetchGraphql<IndexedTransfer>(account, transfersQuery, 'TokenTransfer'),
      fetchGraphql<IndexedTransfer>(account, receivedQuery, 'TokenTransfer'),
      fetchGraphql<IndexedSavingsActivity>(account, savingsQuery, 'SavingsActivity'),
    ])
      .then(([sent, received, savingsEvents]) => {
        if (!active) return;
        const unique = new Map([...sent, ...received].map((transfer) => [transfer.id, transfer]));
        setTransfers([...unique.values()].sort((a, b) => Number(b.blockNumber) - Number(a.blockNumber)));
        setSavings(savingsEvents.sort((a, b) => Number(b.blockNumber) - Number(a.blockNumber)));
      })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : 'Could not load on-chain activity.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [account]);

  return { transfers, savings, loading, error, configured: Boolean(GRAPHQL_URL) };
}

export function formatIndexedTransfer(transfer: IndexedTransfer, account: string) {
  const outgoing = transfer.from.toLowerCase() === account.toLowerCase();
  const token = transfer.token.toLowerCase() === AUSD_ADDRESS ? 'AUSD'
    : transfer.token.toLowerCase() === USDC_ADDRESS ? 'USDC'
    : transfer.token.toLowerCase() === CTK_ADDRESS ? 'CTK' : 'Token';
  const decimals = token === 'CTK' ? 18 : 6;
  const amount = Number(formatUnits(BigInt(transfer.value), decimals));
  const counterparty = outgoing ? transfer.to : transfer.from;
  const timestamp = Number(transfer.timestamp) * 1000;
  return {
    id: transfer.id,
    outgoing,
    token,
    amount,
    counterparty,
    transactionHash: transfer.transactionHash,
    createdAt: new Date(timestamp).toISOString(),
  };
}

export function formatIndexedSavings(activity: IndexedSavingsActivity, account: string) {
  const outgoing = activity.owner.toLowerCase() === account.toLowerCase();
  const rawAmount = activity.amount ?? activity.paymentAmount ?? activity.savedAmount ?? '0';
  const amount = Number(formatUnits(BigInt(rawAmount), 6));
  const labels: Record<string, string> = {
    'pocket-created': 'Pocket created', 'autosave-rate-updated': 'Auto-save updated', deposited: 'Pocket deposit',
    withdrawn: 'Pocket withdrawal', 'payment-autosave': 'Payment + auto-save', 'pocket-gift': 'Pocket gift',
    'person-gift': 'Gift sent', 'gift-allocated': 'Gift allocated', 'gift-withdrawn': 'Gift withdrawal',
  };
  return {
    id: activity.id, title: labels[activity.kind] ?? 'Savings activity', outgoing, amount,
    counterparty: activity.counterparty ?? '', transactionHash: activity.transactionHash,
    createdAt: new Date(Number(activity.timestamp) * 1000).toISOString(), kind: activity.kind,
  };
}
