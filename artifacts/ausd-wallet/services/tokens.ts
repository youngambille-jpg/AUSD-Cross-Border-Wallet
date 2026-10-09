import type { Address } from 'viem';

export type WalletToken = 'AUSD' | 'USDC' | 'CTK';

export interface WalletTokenInfo {
  symbol: WalletToken;
  name: string;
  address: Address;
  decimals: number;
}

export const WALLET_TOKENS: Record<WalletToken, WalletTokenInfo> = {
  AUSD: {
    symbol: 'AUSD',
    name: 'Agora AUSD',
    address: '0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC',
    decimals: 6,
  },
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0x534b2f3A21130d7a60830c2Df862319e593943A3',
    decimals: 6,
  },
  CTK: {
    symbol: 'CTK',
    name: 'Testnet payout token',
    address: '0x7BEb5D9DB0d85cBEa543C04f0dE8c23c2176cd9D',
    decimals: 18,
  },
};

export const TRANSFER_TOKENS: WalletToken[] = ['AUSD', 'USDC'];
export const STABLECOIN_TOKENS: WalletToken[] = ['AUSD', 'USDC'];

export function getWalletToken(symbol: string | undefined, fallback: WalletToken = 'AUSD') {
  const normalized = symbol?.toUpperCase() as WalletToken | undefined;
  return normalized && WALLET_TOKENS[normalized] ? normalized : fallback;
}

