import { useEffect, useState } from 'react';
import { formatUnits } from 'viem';

const GRAPHQL_URL = process.env.EXPO_PUBLIC_ENVIO_GRAPHQL_URL?.trim();
const AUSD_ADDRESS = '0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC'.toLowerCase();
const CTK_ADDRESS = '0x7BEb5D9DB0d85cBEa543C04f0dE8c23c2176cd9D'.toLowerCase();

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

interface GraphQLResponse {
  data?: { TokenTransfer?: IndexedTransfer[] };
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

async function fetchTransfers(account: string, query: string): Promise<IndexedTransfer[]> {
  if (!GRAPHQL_URL) return [];
  const response = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: { account: account.toLowerCase() } }),
  });
  if (!response.ok) throw new Error(`Activity service returned ${response.status}.`);
  const result = await response.json() as GraphQLResponse;
  if (result.errors?.length) throw new Error(result.errors[0]?.message ?? 'Activity query failed.');
  return result.data?.TokenTransfer ?? [];
}

export function useIndexedActivity(account?: string) {
  const [transfers, setTransfers] = useState<IndexedTransfer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!GRAPHQL_URL || !account) {
      setTransfers([]);
      setLoading(false);
      setError('');
      return;
    }
    let active = true;
    setLoading(true);
    setError('');
    Promise.all([
      fetchTransfers(account, transfersQuery),
      fetchTransfers(account, receivedQuery),
    ])
      .then(([sent, received]) => {
        if (!active) return;
        const unique = new Map([...sent, ...received].map((transfer) => [transfer.id, transfer]));
        setTransfers([...unique.values()].sort((a, b) => Number(b.blockNumber) - Number(a.blockNumber)));
      })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : 'Could not load on-chain activity.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [account]);

  return { transfers, loading, error, configured: Boolean(GRAPHQL_URL) };
}

export function formatIndexedTransfer(transfer: IndexedTransfer, account: string) {
  const outgoing = transfer.from.toLowerCase() === account.toLowerCase();
  const token = transfer.token.toLowerCase() === AUSD_ADDRESS ? 'AUSD'
    : transfer.token.toLowerCase() === CTK_ADDRESS ? 'CTK' : 'Token';
  const decimals = token === 'AUSD' ? 6 : 18;
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
