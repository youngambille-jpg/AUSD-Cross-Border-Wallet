# AUSD Wallet

Expo mobile wallet prototype for AUSD payments. New users move through a three-screen swipe introduction, then create a Mera passkey account. Mera authenticates wallet actions, direct AUSD transfers and Agora Instant Settlement swaps can submit sponsored transactions on Monad testnet, and CTK is used as a mock payout token. No fiat payment, card charge, or cross-chain transfer is submitted.

## Passkey setup

Mera uses WebAuthn PRF support. It is supported in React Native on iOS 18+ and Android 9+; native builds need `react-native-passkey` autolinked into the app (use a development or production build, not Expo Go).

Set `EXPO_PUBLIC_RP_ID` to the hostname that will own the passkey. It must be a verified HTTPS domain and match the app’s native domain associations. If omitted, the Expo development domain is used when available. Native builds also accept:

- `AUSD_IOS_BUNDLE_ID` (defaults to `com.ausd.wallet`)
- `AUSD_IOS_TEAM_ID` for the iOS `apple-app-site-association` response
- `AUSD_ANDROID_PACKAGE` (defaults to `com.ausd.wallet`)
- `AUSD_ANDROID_SHA256_CERT_FINGERPRINTS`, comma-separated, for Android `assetlinks.json`

The Expo config adds iOS Associated Domains and the Android verified web link when an RP ID is set. The app server serves `/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json` from the variables above. Publish the server on the same HTTPS hostname as the RP ID. The association endpoints respond with a configuration error until the platform signing values are provided.

Mera credential IDs and transports are stored locally so the user can authenticate again. The PRF output is converted into the standard EVM BIP-44 account key at `m/44'/60'/0'/0/0`; the PRF output, derived key, seed, and signing session are cleared after deriving the address and are not persisted.

## Monad testnet transfers and settlement

The Mera PRF derives a standard EVM BIP-44 owner and a Kernel v0.3.1 smart account (EntryPoint v0.7). Direct sends authenticate with Mera and submit an AUSD transfer through a sponsored UserOperation. Agora settlement re-reads its AUSD→CTK quote, checks it has not changed, then submits the approved testnet settlement flow through a sponsored UserOperation. CTK is a test token, not a fiat payout. These actions can move test tokens on Monad testnet; do not use mainnet funds.

Set `EXPO_PUBLIC_ALCHEMY_MONAD_RPC_URL` to an Alchemy Monad testnet RPC URL to route balance and Agora quote reads through Alchemy. The app falls back to Monad's public testnet RPC when this variable is absent. `EXPO_PUBLIC_*` values are embedded in the app bundle; use a dedicated testnet key with appropriate limits and keep local environment files out of version control.

Agora's unauthenticated public metrics endpoint appears on Profile. Authenticated Agora API routes are not called. Add and Cash out tabs describe a planned Alchemy Pay connection; they do not launch checkout or submit a payout. Card issuing and cross-chain transfers are not enabled. Agora's testnet swap is enabled through the existing send/review flow.

## Android development APK on Codemagic

The repository-root `codemagic.yaml` generates the Android native project with Expo prebuild, builds `assembleDebug`, and archives `artifacts/ausd-wallet/android/app/build/outputs/apk/debug/*.apk`. The workflow installs the pnpm workspace lockfile and runs on pushes to `main`.

Configure a Codemagic variable group named `ausd_wallet`. Add `EXPO_PUBLIC_ALCHEMY_MONAD_RPC_URL` for Alchemy-backed testnet reads. For passkey use in the installed app, also configure `EXPO_PUBLIC_RP_ID` and the Android package/signing-certificate association values used by the app's `/.well-known/assetlinks.json` endpoint. Download the APK from the Codemagic build artifacts. The existing workflow triggers on pushes to `main`; use Codemagic's manual start action to build another branch.

## Android APK on GitHub Actions

The `.github/workflows/build-android-apk.yml` workflow builds an installable debug APK on every push and can also be started from the repository's **Actions** tab with **Run workflow**. After a successful run, download `ausd-wallet-android-debug-<commit>` from that run's artifacts. Artifacts are retained for 14 days.

To produce an APK configured for the live testnet demo, add these repository or environment **Actions secrets**: `EXPO_PUBLIC_RP_ID`, `EXPO_PUBLIC_ALCHEMY_MONAD_RPC_URL`, and `EXPO_PUBLIC_PIMLICO_BUNDLER_URL`. Add `EXPO_PUBLIC_PIMLICO_POLICY_ID` if the Pimlico URL does not select the sponsorship policy. These `EXPO_PUBLIC_*` values are compiled into the APK; use restricted testnet credentials. `AUSD_ANDROID_PACKAGE` can be set as a repository Actions variable; it defaults to `com.ausd.wallet`. Passkey authentication also requires the matching Android asset links file to be published for the RP domain and signing certificate.

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
