import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { PasskeyCredentialMetadata } from '@category-labs/mera';

const LEGACY_STORAGE_KEY = 'ausd-wallet-state-v1';
const PROFILE_STORAGE_KEY = 'ausd-wallet-profile-v2';
const TRANSFERS_STORAGE_KEY = 'ausd-wallet-transfers-v2';
const INTRO_STORAGE_KEY = 'ausd-wallet-intro-complete-v1';
const DEMO_BALANCE = 1248.5;

export type WalletMode = 'demo' | 'mera';

export interface WalletProfile {
  displayName: string;
  email: string;
  address?: string;
  signerAddress?: string;
  mode: WalletMode;
  passkey?: {
    credential: PasskeyCredentialMetadata;
    rpId: string;
  };
}

export interface Transfer {
  id: string;
  recipient: string;
  amount: number;
  currency: string;
  receivedAmount: number;
  createdAt: string;
  mode: WalletMode;
  contractPresent?: boolean;
  pairAddress?: string;
  quoteOutput?: string;
  quoteSymbol?: string;
  transactionHash?: string;
  sponsored?: boolean;
  settlementKind?: 'direct' | 'agora-instant-settlement';
  receivedCurrency?: string;
}

interface WalletState {
  profile: WalletProfile | null;
  transfers: Transfer[];
}

interface WalletContextValue extends WalletState {
  ready: boolean;
  authenticated: boolean;
  introComplete: boolean;
  storageError: string;
  balance: number;
  completeIntro: () => Promise<void>;
  completeOnboarding: (profile: WalletProfile) => Promise<void>;
  addTransfer: (transfer: Transfer) => Promise<void>;
  unlockWallet: () => void;
  lockWallet: () => void;
  resetWallet: () => Promise<void>;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WalletState>({ profile: null, transfers: [] });
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [introComplete, setIntroComplete] = useState(false);
  const [storageError, setStorageError] = useState('');

  useEffect(() => {
    let active = true;
    async function hydrate() {
      try {
        const [legacyValue, transfersValue, profileValue, introValue] = await Promise.all([
          AsyncStorage.getItem(LEGACY_STORAGE_KEY),
          AsyncStorage.getItem(TRANSFERS_STORAGE_KEY),
          Platform.OS === 'web'
            ? AsyncStorage.getItem(PROFILE_STORAGE_KEY)
            : SecureStore.getItemAsync(PROFILE_STORAGE_KEY),
          AsyncStorage.getItem(INTRO_STORAGE_KEY),
        ]);
        const legacy = legacyValue ? JSON.parse(legacyValue) as WalletState : null;
        const legacyProfile = legacy?.profile?.mode === 'mera' ? legacy.profile : null;
        const profile = profileValue
          ? JSON.parse(profileValue) as WalletProfile
          : legacyProfile;
        const transfers = transfersValue
          ? JSON.parse(transfersValue) as Transfer[]
          : Array.isArray(legacy?.transfers) ? legacy.transfers : [];

        // Migrate each value first. Keep the original combined record until both
        // destination writes have succeeded so a failed migration is recoverable.
        if (!profileValue && legacyProfile) {
          const serializedProfile = JSON.stringify(legacyProfile);
          if (Platform.OS === 'web') await AsyncStorage.setItem(PROFILE_STORAGE_KEY, serializedProfile);
          else await SecureStore.setItemAsync(PROFILE_STORAGE_KEY, serializedProfile);
        }
        if (!transfersValue && legacy?.transfers) {
          await AsyncStorage.setItem(TRANSFERS_STORAGE_KEY, JSON.stringify(transfers));
        }
        if (legacyValue) await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);

        if (!active) return;
        setState({ profile: profile?.mode === 'mera' ? profile : null, transfers });
        setIntroComplete(introValue === '1');
      } catch (caught) {
        if (!active) return;
        setState({ profile: null, transfers: [] });
        setStorageError(caught instanceof Error
          ? `Wallet data could not be opened. Your saved data was preserved. ${caught.message}`
          : 'Wallet data could not be opened. Your saved data was preserved.');
      }
    }
    void hydrate()
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const persist = useCallback(async (next: WalletState) => {
    if (next.profile?.mode === 'mera') {
      const value = JSON.stringify(next.profile);
      if (Platform.OS === 'web') await AsyncStorage.setItem(PROFILE_STORAGE_KEY, value);
      else await SecureStore.setItemAsync(PROFILE_STORAGE_KEY, value);
    } else if (Platform.OS === 'web') {
      await AsyncStorage.removeItem(PROFILE_STORAGE_KEY);
    } else {
      await SecureStore.deleteItemAsync(PROFILE_STORAGE_KEY);
    }
    await AsyncStorage.setItem(TRANSFERS_STORAGE_KEY, JSON.stringify(next.transfers));
    setState(next);
  }, []);

  const completeIntro = useCallback(async () => {
    await AsyncStorage.setItem(INTRO_STORAGE_KEY, '1');
    setIntroComplete(true);
  }, []);

  const completeOnboarding = useCallback(
    async (profile: WalletProfile) => {
      if (profile.mode !== 'mera') throw new Error('A Mera passkey account is required.');
      await persist({ profile, transfers: state.transfers });
      setAuthenticated(true);
    },
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
    if (Platform.OS === 'web') await AsyncStorage.removeItem(PROFILE_STORAGE_KEY);
    else await SecureStore.deleteItemAsync(PROFILE_STORAGE_KEY);
    await AsyncStorage.removeItem(TRANSFERS_STORAGE_KEY);
    await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
    setState({ profile: null, transfers: [] });
    setAuthenticated(false);
  }, []);

  const unlockWallet = useCallback(() => setAuthenticated(true), []);
  const lockWallet = useCallback(() => setAuthenticated(false), []);

  const value = useMemo(
    () => ({
      ...state,
      ready,
      authenticated,
      introComplete,
      storageError,
      balance: DEMO_BALANCE,
      completeIntro,
      completeOnboarding,
      addTransfer,
      unlockWallet,
      lockWallet,
      resetWallet,
    }),
    [state, ready, authenticated, introComplete, storageError, completeIntro, completeOnboarding, addTransfer, unlockWallet, lockWallet, resetWallet],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const value = useContext(WalletContext);
  if (!value) throw new Error('useWallet must be used inside WalletProvider.');
  return value;
}
