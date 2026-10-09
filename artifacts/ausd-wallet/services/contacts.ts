import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PasskeySecretVault } from '@category-labs/mera';
import { getAddress, isAddress } from 'viem';
import type { MeraPasskeyProfile } from '@/services/passkey';
import { decryptWithMeraPasskey, encryptWithMeraPasskey } from '@/services/passkey';

const STORAGE_KEY = 'ausd-mera-contacts-v1';

export interface WalletContact {
  id: string;
  name: string;
  address: `0x${string}`;
  createdAt: string;
}

function validateContacts(decoded: unknown): WalletContact[] {
  if (!Array.isArray(decoded)) throw new Error('The encrypted contacts backup has an unexpected format.');
  const contacts: WalletContact[] = [];
  const names = new Set<string>();
  const addresses = new Set<string>();

  for (const entry of decoded) {
    if (!entry || typeof entry !== 'object') throw new Error('A contact in this backup is invalid.');
    const value = entry as Partial<WalletContact>;
    const name = typeof value.name === 'string' ? value.name.trim() : '';
    if (typeof value.id !== 'string' || !name || name.length > 48
      || typeof value.address !== 'string' || !isAddress(value.address, { strict: false })
      || typeof value.createdAt !== 'string') {
      throw new Error('A contact in this backup is invalid.');
    }
    let address: `0x${string}`;
    try {
      address = getAddress(value.address);
    } catch {
      throw new Error('A contact in this backup has an invalid address checksum.');
    }
    const normalizedName = name.toLocaleLowerCase();
    const normalizedAddress = address.toLowerCase();
    if (names.has(normalizedName) || addresses.has(normalizedAddress)) {
      throw new Error('This contacts backup has duplicate names or wallet addresses.');
    }
    names.add(normalizedName);
    addresses.add(normalizedAddress);
    contacts.push({ id: value.id, name, address, createdAt: value.createdAt });
  }
  return contacts;
}

export async function loadContacts(account: MeraPasskeyProfile): Promise<WalletContact[]> {
  const serialized = await AsyncStorage.getItem(STORAGE_KEY);
  if (!serialized) return [];
  const plaintext = await decryptWithMeraPasskey(account, JSON.parse(serialized));
  return validateContacts(JSON.parse(plaintext) as unknown);
}

export async function saveContacts(account: MeraPasskeyProfile, contacts: WalletContact[]) {
  const validContacts = validateContacts(contacts);
  const vault: PasskeySecretVault = await encryptWithMeraPasskey(account, JSON.stringify(validContacts));
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(vault));
}

export async function exportContactsVault() {
  return AsyncStorage.getItem(STORAGE_KEY);
}

export async function importContactsVault(account: MeraPasskeyProfile, serialized: string) {
  const vault: unknown = JSON.parse(serialized);
  const plaintext = await decryptWithMeraPasskey(account, vault);
  const contacts = validateContacts(JSON.parse(plaintext) as unknown);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(vault));
  return contacts;
}
