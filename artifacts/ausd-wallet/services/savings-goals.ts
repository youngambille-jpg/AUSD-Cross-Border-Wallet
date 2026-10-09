import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PasskeySecretVault } from '@category-labs/mera';
import type { MeraPasskeyProfile } from '@/services/passkey';
import { decryptWithMeraPasskey, encryptWithMeraPasskey } from '@/services/passkey';

const STORAGE_KEY = 'ausd-savings-goals-v1';

export interface SavingsGoal {
  id: string;
  name: string;
  target: number;
  saved: number;
  createdAt: string;
}

function validateGoals(decoded: unknown): SavingsGoal[] {
  if (!Array.isArray(decoded)) throw new Error('The encrypted savings plan has an unexpected format.');
  return decoded.filter((goal): goal is SavingsGoal => {
    if (!goal || typeof goal !== 'object') return false;
    const value = goal as Partial<SavingsGoal>;
    return typeof value.id === 'string' && typeof value.name === 'string'
      && Number.isFinite(value.target) && Number.isFinite(value.saved)
      && typeof value.createdAt === 'string';
  });
}

export async function loadSavingsGoals(account: MeraPasskeyProfile): Promise<SavingsGoal[]> {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  const decoded = JSON.parse(await decryptWithMeraPasskey(account, JSON.parse(stored))) as unknown;
  return validateGoals(decoded);
}

export async function saveSavingsGoals(account: MeraPasskeyProfile, goals: SavingsGoal[]) {
  const vault: PasskeySecretVault = await encryptWithMeraPasskey(account, JSON.stringify(goals));
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(vault));
}

export async function exportSavingsVault() {
  return AsyncStorage.getItem(STORAGE_KEY);
}

export async function importSavingsVault(account: MeraPasskeyProfile, serialized: string) {
  const vault: unknown = JSON.parse(serialized);
  const decoded = validateGoals(JSON.parse(await decryptWithMeraPasskey(account, vault)) as unknown);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(vault));
  return decoded;
}

