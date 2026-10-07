export interface AgoraMetrics {
  totalSupply?: string;
  circulatingSupply?: string;
  partial?: boolean;
  chains?: Array<{ network?: string; totalSupply?: string }>;
}

export async function getAgoraMetrics(): Promise<AgoraMetrics> {
  const response = await fetch('https://api.agora.finance/v0/metrics');
  if (!response.ok) {
    throw new Error(`Agora metrics are unavailable (${response.status}).`);
  }
  const payload: unknown = await response.json();
  if (!payload || typeof payload !== 'object') {
    throw new Error('Agora returned an unexpected metrics response.');
  }
  return payload as AgoraMetrics;
}

export function formatSupply(value?: string) {
  if (!value) return null;
  const amount = Number(value);
  return Number.isFinite(amount)
    ? new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(amount)
    : null;
}
