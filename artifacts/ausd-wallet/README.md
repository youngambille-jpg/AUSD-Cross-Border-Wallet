# AUSD Wallet

Expo mobile wallet prototype for AUSD payments. New users move through a three-screen swipe introduction, then create a Mera passkey account. Mera authenticates wallet actions, direct AUSD transfers and Agora Instant Settlement swaps can submit sponsored transactions on Monad testnet, and CTK is used as a mock payout token. Aurora Intents can quote cross-chain deposits into Monad AUSD and provide a temporary source-chain deposit address.

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

Savings goals create pockets in the deployed Monad testnet `SavingsPockets` contract. Deposits batch an exact-amount AUSD approval with the pocket deposit; payments with auto-save batch an exact-amount approval when needed with the recipient payment and pocket allocation. The send review shows the recipient payment, auto-save amount, and total AUSD debit before Mera passkey approval. Pocket creation does not move AUSD. Legacy goals without a pocket remain labeled as local-only tracking. Confirm each transaction only after checking the recipient and total debit; sponsorship is requested, not guaranteed.

Set `EXPO_PUBLIC_ALCHEMY_MONAD_RPC_URL` to an Alchemy Monad testnet RPC URL to route balance and Agora quote reads through Alchemy. The app falls back to Monad's public testnet RPC when this variable is absent. `EXPO_PUBLIC_*` values are embedded in the app bundle; use a dedicated testnet key with appropriate limits and keep local environment files out of version control.

Aurora Intents deposits require `EXPO_PUBLIC_AURORA_INTENTS_API_KEY`, created in [Aurora Intents Studio](https://studio.aurora.dev/). Add it to local environment as shown in `.env.example`. For GitHub Actions builds, set it as the repository variable `EXPO_PUBLIC_AURORA_INTENTS_API_KEY`; for Codemagic, add it to the `ausd_wallet` variable group. Restart or rebuild after configuring. The key is public and embedded in the app bundle. The app loads supported assets, selects the configured Monad AUSD contract, requests a quote, shows the generated deposit address and any required memo, and can query transaction status. The user sends the source token from an external wallet; the app does not sign or submit that source-chain transfer. Always follow the quoted source chain, token, amount, address, memo, and expiry.

Agora's unauthenticated public metrics endpoint appears on Profile. Add and Cash out tabs describe a planned Alchemy Pay connection; they do not launch checkout or submit a payout. Card issuing is not enabled. Agora's testnet swap is enabled through the existing send/review flow.

## Android demo APK on Codemagic

The repository-root `codemagic.yaml` generates the Android native project with Expo prebuild, builds the bundled `assembleRelease` app, and archives `artifacts/ausd-wallet/android/app/build/outputs/apk/release/*.apk`. The workflow installs the pnpm workspace lockfile and runs on pushes to `main`.

Configure a Codemagic variable group named `ausd_wallet`. Add `EXPO_PUBLIC_ALCHEMY_MONAD_RPC_URL` for Alchemy-backed testnet reads. For passkey use in the installed app, also configure `EXPO_PUBLIC_RP_ID` and the Android package/signing-certificate association values used by the app's `/.well-known/assetlinks.json` endpoint. Download the APK from the Codemagic build artifacts. The existing workflow triggers on pushes to `main`; use Codemagic's manual start action to build another branch.

## Android APK on GitHub Actions

The `.github/workflows/build-android-apk.yml` workflow builds the bundled app APK on every push and can also be started from the repository's **Actions** tab with **Run workflow**. After a successful run, download `ausd-wallet-android-<commit>` from that run's artifacts. Artifacts are retained for 14 days. This is a release-variant APK for demo installation, not a Play Store-signed production release.

To produce an APK configured for the live testnet demo, add repository **Actions secrets** in **Settings → Secrets and variables → Actions**: `EXPO_PUBLIC_RP_ID` and `EXPO_PUBLIC_PIMLICO_BUNDLER_URL` are required by the build workflow. `EXPO_PUBLIC_ALCHEMY_MONAD_RPC_URL` is optional; without it the app uses Monad public testnet RPC. Add `EXPO_PUBLIC_PIMLICO_POLICY_ID` if the Pimlico URL does not select the sponsorship policy. The `EXPO_PUBLIC_*` values are compiled into the APK; use restricted testnet credentials. `AUSD_ANDROID_PACKAGE` can be set as a repository Actions variable; it defaults to `com.ausd.wallet`. Passkey authentication also requires the matching Android asset links file to be published for the RP domain and signing certificate.

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

## Payment requests and indexed activity

Receive creates an AUSD payment-request QR code and share link. Send can scan the request and prefill its recipient and optional amount for review; the sender must still approve with their passkey. Camera permission is requested only when scanning.

The private contacts book stores user-chosen names with confirmed smart-account addresses in a Mera-encrypted vault on device. Contacts can be exported and restored as encrypted data with the same passkey and RP domain. Selecting a contact pre-fills Send and shows the saved name during transaction review; there is no global username directory.

The Envio indexer is in `artifacts/wallet-indexer`. In Envio Cloud, set **Root Directory** to `artifacts/wallet-indexer` and **Config File** to `config.yaml`; that directory contains the exact Envio version pin Cloud checks. The indexer pins Envio `3.14.0`, pnpm `10.32.0`, and Node 24+. Deploy it, then set its public GraphQL URL as the GitHub Actions repository variable `EXPO_PUBLIC_ENVIO_GRAPHQL_URL`. Set the same variable in the local wallet environment to use indexed activity during development. It indexes Monad testnet AUSD and CTK `Transfer` events starting from the configured latest block. If the URL is missing or unavailable, the activity screen falls back to transfers saved on the device.
