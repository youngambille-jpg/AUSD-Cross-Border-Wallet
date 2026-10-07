# AUSD Wallet

Expo mobile wallet experience with Mera passkey onboarding and sponsored ERC-20 AUSD transfers on Monad testnet.

## Passkey setup

Mera uses WebAuthn PRF support. It is supported in React Native on iOS 18+ and Android 9+; native builds need `react-native-passkey` autolinked into the app (use a development or production build, not Expo Go).

Set `EXPO_PUBLIC_RP_ID` to the hostname that will own the passkey. It must be a verified HTTPS domain and match the app’s native domain associations. If omitted, the Expo development domain is used when available. Native builds also accept:

- `AUSD_IOS_BUNDLE_ID` (defaults to `com.ausd.wallet`)
- `AUSD_IOS_TEAM_ID` for the iOS `apple-app-site-association` response
- `AUSD_ANDROID_PACKAGE` (defaults to `com.ausd.wallet`)
- `AUSD_ANDROID_SHA256_CERT_FINGERPRINTS`, comma-separated, for Android `assetlinks.json`

The Expo config adds iOS Associated Domains and the Android verified web link when an RP ID is set. The app server serves `/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json` from the variables above. Publish the server on the same HTTPS hostname as the RP ID. The association endpoints respond with a configuration error until the platform signing values are provided.

Mera credential IDs and transports are stored locally so the user can authenticate again. The PRF output is converted into the standard EVM BIP-44 account key at `m/44'/60'/0'/0/0`; the PRF output, derived key, seed, and signing session are cleared after deriving the address and are not persisted.

## Monad testnet sends

The Mera PRF derives a standard EVM BIP-44 owner. A Kernel v0.3.1 smart account (EntryPoint v0.7) is derived from that signer; the smart account address is the wallet address to fund with testnet AUSD. On confirm, the app requests the PRF again, builds a Pimlico sponsored UserOperation that calls AUSD `transfer`, waits for the Monad receipt, and stores the confirmed transaction hash locally. The dashboard reads AUSD `balanceOf` from the testnet token contract. Demo balances remain local and cannot send.

Set `EXPO_PUBLIC_PIMLICO_BUNDLER_URL` to a Pimlico Monad testnet URL before starting Metro or making an EAS build. `EXPO_PUBLIC_PIMLICO_POLICY_ID` is optional when the key already has a default sponsorship policy. Pimlico sponsorship must be enabled for Monad testnet and must allow the AUSD token transfer. The `EXPO_PUBLIC_*` endpoint is embedded in the app bundle; use a dedicated testnet API key with spend limits. Keep `.env.local` out of version control and set the same variable in the EAS development environment for cloud builds.

Agora’s public metrics API remains on the profile screen. This send transfers AUSD on Monad testnet; it does not perform a fiat payout, cross-chain bridge, FX conversion, or AUSD→CTK swap.

## Commands

- `pnpm --filter @workspace/ausd-wallet run dev` — start the Expo app
- `pnpm --filter @workspace/ausd-wallet run dev:client` — start Metro for an installed native development build
- `pnpm --filter @workspace/ausd-wallet run typecheck` — typecheck the app
- `pnpm --filter @workspace/ausd-wallet run build` — create its static Expo build

## Install an Android passkey build

Expo Go cannot load Mera’s native passkey module. Build and install the Android development APK once, then use `dev:client` for JavaScript iteration:

1. Set `EXPO_PUBLIC_RP_ID` to the public HTTPS hostname configured for passkeys, and publish the Android asset links file with the package name and signing certificate SHA-256 fingerprint.
2. Run `eas build --platform android --profile development` to produce an installable APK.
3. Install that APK on an Android 9+ device, then run `pnpm --filter @workspace/ausd-wallet run dev:client` and open the app.

The current Expo Go preview remains useful for the UI, but passkey creation and authentication only work in the native development build (or supported web browser).
