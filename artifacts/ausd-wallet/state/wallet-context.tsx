import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

const STORAGE_KEY = 'ausd-wallet-state-v1';
const DEMO_BALANCE = 1248.5;

export type WalletMode = 'demo' | 'mera';

export interface WalletProfile {
  displayName: string;
  email: string;
  address?: string;
  mode: WalletMode;
}

export interface Transfer {
  id: string;
  recipient: string;
  amount: number;
  currency: string;
  receivedAmount: number;
  createdAt: string;
  mode: WalletMode;
  contractPresent: boolean;
}

interface WalletState {
  profile: WalletProfile | null;
  transfers: Transfer[];
}

interface WalletContextValue extends WalletState {
  ready: boolean;
  balance: number;
  completeOnboarding: (profile: WalletProfile) => Promise<void>;
  addTransfer: (transfer: Transfer) => Promise<void>;
  resetWallet: () => Promise<void>;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WalletState>({ profile: null, transfers: [] });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (!active) return;
        if (stored) {
          const parsed = JSON.parse(stored) as WalletState;
          setState({
            profile: parsed.profile ?? null,
            transfers: Array.isArray(parsed.transfers) ? parsed.transfers : [],
          });
        }
      })
      .catch(() => {
        if (active) setState({ profile: null, transfers: [] });
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const persist = useCallback(async (next: WalletState) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setState(next);
  }, []);

  const completeOnboarding = useCallback(
    async (profile: WalletProfile) =>
      persist({ profile, transfers: state.transfers }),
    [persist, state.transfers],
  );

  const addTransfer = useCallback(
    async (transfer: Transfer) => {
      if (!state.profile) throw new Error('Set up a wallet before sending.');
      await persist({
        profile: state.profile,
        transfers: [transfer, ...state.transfers],
      });
    },
    [persist, state.profile, state.transfers],
  );

  const resetWallet = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setState({ profile: null, transfers: [] });
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      ready,
      balance: DEMO_BALANCE,
      completeOnboarding,
      addTransfer,
      resetWallet,
    }),
    [state, ready, completeOnboarding, addTransfer, resetWallet],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const value = useContext(WalletContext);
  if (!value) throw new Error('useWallet must be used inside WalletProvider.');
  return value;
}
