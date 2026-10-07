import { Platform } from 'react-native';
import { HDKey } from '@scure/bip32';
import { entropyToMnemonic, mnemonicToSeedSync } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import { privateKeyToAccount } from 'viem/accounts';

function getRelyingPartyId() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.location.hostname;
  }
  return process.env.EXPO_PUBLIC_RP_ID;
}

function deriveWalletAddress(prfOutput: Uint8Array) {
  const mnemonic = entropyToMnemonic(prfOutput, wordlist);
  const seed = mnemonicToSeedSync(mnemonic);
  let privateKey: Uint8Array | null = null;
  try {
    const node = HDKey.fromMasterSeed(seed).derive("m/44'/60'/0'/0/0");
    if (!node.privateKey) {
      throw new Error('Mera returned a passkey, but wallet derivation failed.');
    }
    privateKey = node.privateKey;
    const hex = Array.from(privateKey, (byte) => byte.toString(16).padStart(2, '0')).join('');
    return privateKeyToAccount(`0x${hex}`).address;
  } finally {
    seed.fill(0);
    prfOutput.fill(0);
    privateKey?.fill(0);
  }
}

export async function createMeraPasskey(name: string, email: string) {
  const rpId = getRelyingPartyId();
  if (!rpId) {
    throw new Error(
      'Passkey setup needs a verified HTTPS domain. Use the demo wallet for now, or configure EXPO_PUBLIC_RP_ID and the iOS/Android domain association files.',
    );
  }

  const mera = await import('@category-labs/mera');
  const webAuthnClient =
    Platform.OS === 'web'
      ? undefined
      : (await import('@category-labs/mera/react-native-webauthn-client'))
          .reactNativeWebAuthnClient;

  const { prfOutput } = await mera.createPasskeyWithPrfOutput({
    rp: { id: rpId, name: 'AUSD Wallet' },
    user: { name: email, displayName: name },
    ...(webAuthnClient ? { webAuthnClient } : {}),
  });

  return {
    address: deriveWalletAddress(prfOutput),
    email,
    displayName: name,
  };
}
