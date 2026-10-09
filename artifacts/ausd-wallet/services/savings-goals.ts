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
  pocketId?: `0x${string}`;
  autoSaveBps?: number;
  localTracked?: number;
}

function validateGoals(decoded: unknown): SavingsGoal[] {
  if (!Array.isArray(decoded)) throw new Error('The encrypted savings plan has an unexpected format.');
  return decoded.filter((goal): goal is SavingsGoal => {
    if (!goal || typeof goal !== 'object') return false;
    const value = goal as Partial<SavingsGoal>;
    const validPocketId = value.pocketId === undefined || /^0x[0-9a-fA-F]{64}$/.test(value.pocketId);
    const validAutoSaveBps = value.autoSaveBps === undefined
      || (Number.isInteger(value.autoSaveBps) && value.autoSaveBps >= 0 && value.autoSaveBps <= 10_000);
    const validLocalTracked = value.localTracked === undefined
      || (Number.isFinite(value.localTracked) && value.localTracked >= 0);
    return typeof value.id === 'string' && typeof value.name === 'string'
      && Number.isFinite(value.target) && Number.isFinite(value.saved)
      && typeof value.createdAt === 'string' && validPocketId && validAutoSaveBps && validLocalTracked;
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

