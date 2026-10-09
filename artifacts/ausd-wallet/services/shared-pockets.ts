import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PasskeySecretVault } from '@category-labs/mera';
import { getAddress, isAddress } from 'viem';
import type { MeraPasskeyProfile } from '@/services/passkey';
import { decryptWithMeraPasskey, encryptWithMeraPasskey } from '@/services/passkey';

const STORAGE_KEY = 'ausd-shared-pockets-v1';
const CODE_PREFIX = 'AUSD-POCKET-1:';

export interface SharedPocket {
  id: string;
  owner: `0x${string}`;
  pocketId: `0x${string}`;
  name: string;
  createdAt: string;
}

function validPocketId(value: unknown): value is `0x${string}` {
  return typeof value === 'string' && /^0x[0-9a-fA-F]{64}$/.test(value);
}

function validateSharedPockets(decoded: unknown): SharedPocket[] {
  if (!Array.isArray(decoded)) throw new Error('The shared pocket backup has an unexpected format.');
  const ids = new Set<string>();
  return decoded.map((entry) => {
    if (!entry || typeof entry !== 'object') throw new Error('A shared pocket record is invalid.');
    const value = entry as Partial<SharedPocket>;
    if (typeof value.id !== 'string' || !value.id || ids.has(value.id)
      || typeof value.name !== 'string' || !value.name.trim() || value.name.length > 64
      || typeof value.owner !== 'string' || !isAddress(value.owner, { strict: false })
      || !validPocketId(value.pocketId) || typeof value.createdAt !== 'string') {
      throw new Error('A shared pocket record is invalid.');
    }
    ids.add(value.id);
    return {
      id: value.id,
      owner: getAddress(value.owner),
      pocketId: value.pocketId,
      name: value.name.trim(),
      createdAt: value.createdAt,
    };
  });
}

function encodeCode(pocket: Pick<SharedPocket, 'owner' | 'pocketId' | 'name'>) {
  return `${CODE_PREFIX}${encodeURIComponent(JSON.stringify({ owner: pocket.owner, pocketId: pocket.pocketId, name: pocket.name }))}`;
}

export function createSharedPocketCode(pocket: Pick<SharedPocket, 'owner' | 'pocketId' | 'name'>) {
  if (!isAddress(pocket.owner, { strict: false }) || !validPocketId(pocket.pocketId)) {
    throw new Error('This pocket does not have valid sharing details.');
  }
  return encodeCode(pocket);
}

export function parseSharedPocketCode(code: string): Pick<SharedPocket, 'owner' | 'pocketId' | 'name'> {
  if (!code.startsWith(CODE_PREFIX)) throw new Error('This is not a valid AUSD pocket code.');
  let decoded: unknown;
  try {
    decoded = JSON.parse(decodeURIComponent(code.slice(CODE_PREFIX.length)));
  } catch {
    throw new Error('This pocket code is incomplete or corrupted.');
  }
  const records = validateSharedPockets([{ ...(decoded as object), id: 'import', createdAt: new Date().toISOString() }]);
  const record = records[0];
  return { owner: record.owner, pocketId: record.pocketId, name: record.name };
}

export async function loadSharedPockets(account: MeraPasskeyProfile): Promise<SharedPocket[]> {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  const plaintext = await decryptWithMeraPasskey(account, JSON.parse(stored));
  return validateSharedPockets(JSON.parse(plaintext) as unknown);
}

export async function saveSharedPockets(account: MeraPasskeyProfile, pockets: SharedPocket[]) {
  const vault: PasskeySecretVault = await encryptWithMeraPasskey(account, JSON.stringify(validateSharedPockets(pockets)));
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(vault));
}

export async function exportSharedPocketsVault() {
  return AsyncStorage.getItem(STORAGE_KEY);
}

