# Codex conversation

## User

from ausd-wallet The passkey ceremony could not finish for RP domain auth.vic-ezealor.workers.dev. Check that the app’s RP domain has the matching Android assetlinks.json or iOS apple-app-site-association file, then retr If Mera's passkey flow is already serving the SHA-256 fingerprint and the Android credentials correctly, then we should investigate the association between the RP domain, the Android app, and Mera's WebAuthn implementation rather than assume the file is missing.

From your screenshot, the RP domain is:

`auth.vic-ezealor.workers.dev`

There are a few important distinctions:

* Android Digital Asset Links: `/.well-known/assetlinks.json` must be served by the RP domain and contain the correct Android package name and signing-certificate fingerprint.

* RP ID consistency: The RP ID used during passkey registration must match the domain expected by the WebAuthn server. It must not include a scheme or path.

* Signing certificate: The fingerprint must match the certificate used to sign the installed Android build, which may differ between debug and release builds.

* Mera's implementation: If Mera uses a custom passkey flow or native bridge, we need to check how it associates the app with the RP domain.

One key question: When you open `https://auth.vic-ezealor.workers.dev/.well-known/assetlinks.json` in your browser, does it return the correct JSON, including your Android package name and SHA-256 fingerprint?

If it does, share the relevant passkey registration code and Android package ID from `youngambille-jpg/ausd-cross-border-wallet`. I can help pinpoint the failure without unnecessarily changing a working association file.

## Assistant

I’ll trace the wallet’s passkey registration path and the Android app identity, then check how the auth worker serves its asset links. I’ll keep the association-file diagnosis grounded in the code and current configuration.

## Activity

    $ pwd && rg -n -i "passkey|webauthn|assetlinks|rp.?id|apple-app-site-association|workers.dev|packageName|applicationId" artifacts/ausd-wallet
    bwrap: Unexpected capabilities but not setuid, old file caps config?
    ✗ (1) • 0ms

## Activity

    $ rg -n -i "passkey|webauthn|assetlinks|rp.?id|apple-app-site-association|workers.dev|packageName|applicationId" artifacts/ausd-wallet
    bwrap: Unexpected capabilities but not setuid, old file caps config?
    ✗ (1) • 0ms

## Activity

    $ pwd
    bwrap: Unexpected capabilities but not setuid, old file caps config?
    ✗ (1) • 0ms

## Activity

    Opened https://auth.vic-ezealor.workers.dev/.well-known/assetlinks.json

## Assistant

I couldn’t inspect the wallet code: the workspace shell failed to start (`bwrap: Unexpected capabilities but not setuid`), and the browser tool couldn’t access the asset-links URL. So I can’t confirm the package ID, fingerprint, or Mera’s WebAuthn configuration yet.

Please paste the passkey registration code, the Android `applicationId`/package name, and the asset-links JSON returned by `https://auth.vic-ezealor.workers.dev/.well-known/assetlinks.json`. Then I can compare the RP ID, app identity, and signing fingerprint to pinpoint the mismatch.

## User

inspect the repo

## Assistant

I’m inspecting the wallet and its supporting auth configuration now, focusing on the RP ID, Android app identity, asset-links route, and the WebAuthn ceremony call.

## Activity

    $ rg --files artifacts/ausd-wallet artifacts/api-server | head -300
    artifacts/api-server/tsconfig.json
    artifacts/api-server/src/index.ts
    artifacts/api-server/package.json
    artifacts/api-server/build.mjs
    artifacts/api-server/src/app.ts
    artifacts/api-server/src/lib/logger.ts
    artifacts/api-server/src/routes/index.ts
    artifacts/api-server/src/routes/health.ts
    artifacts/ausd-wallet/README.md
    artifacts/ausd-wallet/app.json
    artifacts/ausd-wallet/package.json
    artifacts/ausd-wallet/eas.json
    artifacts/ausd-wallet/tsconfig.json
    artifacts/ausd-wallet/metro.config.js
    artifacts/ausd-wallet/app.config.ts
    artifacts/ausd-wallet/state/wallet-context.tsx
    artifacts/ausd-wallet/constants/colors.ts
    artifacts/ausd-wallet/components/Primitives.tsx
    artifacts/ausd-wallet/components/KeyboardAwareScrollViewCompat.tsx
    artifacts/ausd-wallet/components/ErrorFallback.tsx
    artifacts/ausd-wallet/components/ErrorBoundary.tsx
    artifacts/ausd-wallet/assets/images/icon.png
    artifacts/ausd-wallet/assets/images/icon4.png
    artifacts/ausd-wallet/app/create-account.tsx
    artifacts/ausd-wallet/app/savings-goals.tsx
    artifacts/ausd-wallet/app/review.tsx
    artifacts/ausd-wallet/app/success.tsx
    artifacts/ausd-wallet/app/contacts.tsx
    artifacts/ausd-wallet/app/aurora-deposit.tsx
    artifacts/ausd-wallet/app/swap.tsx
    artifacts/ausd-wallet/app/scan.tsx
    artifacts/ausd-wallet/app/receive.tsx
    artifacts/ausd-wallet/app/index.tsx
    artifacts/ausd-wallet/app/send.tsx
    artifacts/ausd-wallet/app/_layout.tsx
    artifacts/ausd-wallet/app/+not-found.tsx
    artifacts/ausd-wallet/app/(tabs)/swap.tsx
    artifacts/ausd-wallet/app/(tabs)/settings.tsx
    artifacts/ausd-wallet/app/(tabs)/yield.tsx
    artifacts/ausd-wallet/app/(tabs)/savings.tsx
    artifacts/ausd-wallet/app/(tabs)/activity.tsx
    artifacts/ausd-wallet/app/(tabs)/send.tsx
    artifacts/ausd-wallet/app/(tabs)/_layout.tsx
    artifacts/ausd-wallet/app/(tabs)/index.tsx
    artifacts/ausd-wallet/app/(tabs)/offramp.tsx
    artifacts/ausd-wallet/app/(tabs)/onramp.tsx
    artifacts/ausd-wallet/app/(tabs)/profile.tsx
    artifacts/ausd-wallet/scripts/build.js
    artifacts/ausd-wallet/hooks/useColors.ts
    artifacts/ausd-wallet/server/templates/landing-page.html
    artifacts/ausd-wallet/server/serve.js
    artifacts/ausd-wallet/src/polyfills.ts
    artifacts/ausd-wallet/services/aurora-intents.ts
    artifacts/ausd-wallet/services/indexed-activity.ts
    artifacts/ausd-wallet/services/settlement.ts
    artifacts/ausd-wallet/services/agora.ts
    artifacts/ausd-wallet/services/passkey.ts
    artifacts/ausd-wallet/services/contacts.ts
    artifacts/ausd-wallet/services/savings-pockets.ts
    artifacts/ausd-wallet/services/savings-goals.ts
    artifacts/ausd-wallet/services/tokens.ts
    artifacts/ausd-wallet/services/shared-pockets.ts
    ✓ • 0ms

## Activity

    $ rg -n -i "passkey|webauthn|assetlinks|rp.?id|workers\.dev|android|ios|applicationId|package" artifacts/ausd-wallet artifacts/api-server --glob '!**/node_modules/**'
    artifacts/ausd-wallet/services/shared-pockets.ts:2:import type { PasskeySecretVault } from '@category-labs/mera';
    artifacts/ausd-wallet/services/shared-pockets.ts:4:import type { MeraPasskeyProfile } from '@/services/passkey';
    artifacts/ausd-wallet/services/shared-pockets.ts:5:import { decryptWithMeraPasskey, encryptWithMeraPasskey } from '@/services/passkey';
    artifacts/ausd-wallet/services/shared-pockets.ts:69:export async function loadSharedPockets(account: MeraPasskeyProfile): Promise<SharedPocket[]> {
    artifacts/ausd-wallet/services/shared-pockets.ts:72:  const plaintext = await decryptWithMeraPasskey(account, JSON.parse(stored));
    artifacts/ausd-wallet/services/shared-pockets.ts:76:export async function saveSharedPockets(account: MeraPasskeyProfile, pockets: SharedPocket[]) {
    artifacts/ausd-wallet/services/shared-pockets.ts:77:  const vault: PasskeySecretVault = await encryptWithMeraPasskey(account, JSON.stringify(validateSharedPockets(pockets)));
    artifacts/api-server/build.mjs:25:    // Some packages may not be bundleable, so we externalize them, we can add more here as needed.
    artifacts/api-server/build.mjs:26:    // Some of the packages below may not be imported or installed, but we're adding them in case they are in the future.
    artifacts/api-server/build.mjs:27:    // Examples of unbundleable packages:
    artifacts/api-server/build.mjs:109:    // Make sure packages that are cjs only (e.g. express) but are bundled continue to work in our esm output file
    artifacts/ausd-wallet/README.md:3:Expo mobile wallet prototype for AUSD payments. New users move through a three-screen swipe introduction, then create a Mera passkey account. Mera authenticates wallet actions, direct AUSD transfers and Agora Instant Settlement swaps can submit sponsored transactions on Monad testnet, and CTK is used as a mock payout token. Aurora Intents can quote cross-chain deposits into Monad AUSD and provide a temporary source-chain deposit address.
    artifacts/ausd-wallet/README.md:5:## Passkey setup
    artifacts/ausd-wallet/README.md:7:Mera uses WebAuthn PRF support. It is supported in React Native on iOS 18+ and Android 9+; native builds need `react-native-passkey` autolinked into the app (use a development or production build, not Expo Go).
    artifacts/ausd-wallet/README.md:9:Set `EXPO_PUBLIC_RP_ID` to the hostname that will own the passkey. It must be a verified HTTPS domain and match the app’s native domain associations. If omitted, the Expo development domain is used when available. Native builds also accept:
    artifacts/ausd-wallet/README.md:11:- `AUSD_IOS_BUNDLE_ID` (defaults to `com.ausd.wallet`)
    artifacts/ausd-wallet/README.md:12:- `AUSD_IOS_TEAM_ID` for the iOS `apple-app-site-association` response
    artifacts/ausd-wallet/README.md:13:- `AUSD_ANDROID_PACKAGE` (defaults to `com.ausd.wallet`)
    artifacts/ausd-wallet/README.md:14:- `AUSD_ANDROID_SHA256_CERT_FINGERPRINTS`, comma-separated, for Android `assetlinks.json`
    artifacts/ausd-wallet/README.md:16:The Expo config adds iOS Associated Domains and the Android verified web link when an RP ID is set. The app server serves `/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json` from the variables above. Publish the server on the same HTTPS hostname as the RP ID. The association endpoints respond with a configuration error until the platform signing values are provided.
    artifacts/ausd-wallet/README.md:24:Savings goals create pockets in the deployed Monad testnet `SavingsPockets` contract. Deposits batch an exact-amount AUSD approval with the pocket deposit; payments with auto-save batch an exact-amount approval when needed with the recipient payment and pocket allocation. The send review shows the recipient payment, auto-save amount, and total AUSD debit before Mera passkey approval. Pocket creation does not move AUSD. Legacy goals without a pocket remain labeled as local-only tracking. Confirm each transaction only after checking the recipient and total debit; sponsorship is requested, not guaranteed.
    artifacts/ausd-wallet/README.md:32:## Android demo APK on Codemagic
    artifacts/ausd-wallet/README.md:34:The repository-root `codemagic.yaml` generates the Android native project with Expo prebuild, builds the bundled `assembleRelease` app, and archives `artifacts/ausd-wallet/android/app/build/outputs/apk/release/*.apk`. The workflow installs the pnpm workspace lockfile and runs on pushes to `main`.
    artifacts/ausd-wallet/README.md:36:Configure a Codemagic variable group named `ausd_wallet`. Add `EXPO_PUBLIC_ALCHEMY_MONAD_RPC_URL` for Alchemy-backed testnet reads. For passkey use in the installed app, also configure `EXPO_PUBLIC_RP_ID` and the Android package/signing-certificate association values used by the app's `/.well-known/assetlinks.json` endpoint. Download the APK from the Codemagic build artifacts. The existing workflow triggers on pushes to `main`; use Codemagic's manual start action to build another branch.
    artifacts/ausd-wallet/README.md:38:## Android APK on GitHub Actions
    artifacts/ausd-wallet/README.md:40:The `.github/workflows/build-android-apk.yml` workflow builds the bundled app APK on every push and can also be started from the repository's **Actions** tab with **Run workflow**. After a successful run, download `ausd-wallet-android-<commit>` from that run's artifacts. Artifacts are retained for 14 days. This is a release-variant APK for demo installation, not a Play Store-signed production release.
    artifacts/ausd-wallet/README.md:42:To produce an APK configured for the live testnet demo, add repository **Actions secrets** in **Settings → Secrets and variables → Actions**: `EXPO_PUBLIC_RP_ID` and `EXPO_PUBLIC_PIMLICO_BUNDLER_URL` are required by the build workflow. `EXPO_PUBLIC_ALCHEMY_MONAD_RPC_URL` is optional; without it the app uses Monad public testnet RPC. Add `EXPO_PUBLIC_PIMLICO_POLICY_ID` if the Pimlico URL does not select the sponsorship policy. The `EXPO_PUBLIC_*` values are compiled into the APK; use restricted testnet credentials. `AUSD_ANDROID_PACKAGE` can be set as a repository Actions variable; it defaults to `com.ausd.wallet`. Passkey authentication also requires the matching Android asset links file to be published for the RP domain and signing certificate.
    artifacts/ausd-wallet/README.md:51:## Install an Android passkey build
    artifacts/ausd-wallet/README.md:53:Expo Go cannot load Mera’s native passkey module. Build and install the Android development APK once, then use `dev:client` for JavaScript iteration:
    artifacts/ausd-wallet/README.md:55:1. Set `EXPO_PUBLIC_RP_ID` to the public HTTPS hostname configured for passkeys, and publish the Android asset links file with the package name and signing certificate SHA-256 fingerprint.
    artifacts/ausd-wallet/README.md:56:2. Run `eas build --platform android --profile development` to produce an installable APK.
    artifacts/ausd-wallet/README.md:57:3. Install that APK on an Android 9+ device, then run `pnpm --filter @workspace/ausd-wallet run dev:client` and open the app.
    artifacts/ausd-wallet/README.md:59:The current Expo Go preview remains useful for the UI, but passkey creation and authentication only work in the native development build (or supported web browser).
    artifacts/ausd-wallet/README.md:63:Receive creates an AUSD payment-request QR code and share link. Send can scan the request and prefill its recipient and optional amount for review; the sender must still approve with their passkey. Camera permission is requested only when scanning.
    artifacts/ausd-wallet/README.md:65:The private contacts book stores user-chosen names with confirmed smart-account addresses in a Mera-encrypted vault on device. Contacts can be exported and restored as encrypted data with the same passkey and RP domain. Selecting a contact pre-fills Send and shows the saved name during transaction review; there is no global username directory.
    artifacts/ausd-wallet/app.json:15:    "ios": {
    artifacts/ausd-wallet/app.json:18:    "android": {},
    artifacts/ausd-wallet/package.json:7:    "dev": "sh -c 'if [ -n \"$REPLIT_EXPO_SESSION_SECRET\" ]; then pnpm exec create-launch login --session \"$REPLIT_EXPO_SESSION_SECRET\" || true; fi' && EXPO_PACKAGER_PROXY_URL=https://$REPLIT_EXPO_DEV_DOMAIN EXPO_PUBLIC_DOMAIN=$REPLIT_DEV_DOMAIN EXPO_PUBLIC_REPL_ID=$REPL_ID REACT_NATIVE_PACKAGER_HOSTNAME=$REPLIT_DEV_DOMAIN pnpm exec expo start --localhost --port $PORT",
    artifacts/ausd-wallet/package.json:68:    "react-native-passkey": "^3.6.2",
    artifacts/ausd-wallet/services/savings-goals.ts:2:import type { PasskeySecretVault } from '@category-labs/mera';
    artifacts/ausd-wallet/services/savings-goals.ts:3:import type { MeraPasskeyProfile } from '@/services/passkey';
    artifacts/ausd-wallet/services/savings-goals.ts:4:import { decryptWithMeraPasskey, encryptWithMeraPasskey } from '@/services/passkey';
    artifacts/ausd-wallet/services/savings-goals.ts:35:export async function loadSavingsGoals(account: MeraPasskeyProfile): Promise<SavingsGoal[]> {
    artifacts/ausd-wallet/services/savings-goals.ts:38:  const decoded = JSON.parse(await decryptWithMeraPasskey(account, JSON.parse(stored))) as unknown;
    artifacts/ausd-wallet/services/savings-goals.ts:42:export async function saveSavingsGoals(account: MeraPasskeyProfile, goals: SavingsGoal[]) {
    artifacts/ausd-wallet/services/savings-goals.ts:43:  const vault: PasskeySecretVault = await encryptWithMeraPasskey(account, JSON.stringify(goals));
    artifacts/ausd-wallet/services/savings-goals.ts:51:export async function importSavingsVault(account: MeraPasskeyProfile, serialized: string) {
    artifacts/ausd-wallet/services/savings-goals.ts:53:  const decoded = validateGoals(JSON.parse(await decryptWithMeraPasskey(account, vault)) as unknown);
    artifacts/ausd-wallet/eas.json:10:      "android": {
    artifacts/ausd-wallet/app.config.ts:13:  const rpId = domainHost(process.env.EXPO_PUBLIC_RP_ID || process.env.EXPO_PUBLIC_DOMAIN);
    artifacts/ausd-wallet/app.config.ts:14:  const bundleIdentifier = process.env.AUSD_IOS_BUNDLE_ID || 'com.ausd.wallet';
    artifacts/ausd-wallet/app.config.ts:15:  const androidPackage = process.env.AUSD_ANDROID_PACKAGE || 'com.ausd.wallet';
    artifacts/ausd-wallet/app.config.ts:22:    ios: {
    artifacts/ausd-wallet/app.config.ts:23:      ...config.ios,
    artifacts/ausd-wallet/app.config.ts:26:      ...(rpId ? { associatedDomains: [`webcredentials:${rpId}`] } : {}),
    artifacts/ausd-wallet/app.config.ts:28:    android: {
    artifacts/ausd-wallet/app.config.ts:29:      ...config.android,
    artifacts/ausd-wallet/app.config.ts:30:      package: androidPackage,
    artifacts/ausd-wallet/app.config.ts:31:      ...(rpId
    artifacts/ausd-wallet/app.config.ts:37:                data: [{ scheme: 'https', host: rpId }],
    artifacts/ausd-wallet/server/templates/landing-page.html:408:        const isAndroid = /Android/i.test(ua);
    artifacts/ausd-wallet/server/templates/landing-page.html:409:        const isIOS =
    artifacts/ausd-wallet/server/templates/landing-page.html:420:        if (isIOS) {
    artifacts/ausd-wallet/server/templates/landing-page.html:423:        } else if (isAndroid) {
    artifacts/ausd-wallet/server/templates/landing-page.html:452:        if (isAndroid || isIOS) {
    artifacts/ausd-wallet/state/wallet-context.tsx:12:import type { PasskeyCredentialMetadata } from '@category-labs/mera';
    artifacts/ausd-wallet/state/wallet-context.tsx:28:  passkey?: {
    artifacts/ausd-wallet/state/wallet-context.tsx:29:    credential: PasskeyCredentialMetadata;
    artifacts/ausd-wallet/state/wallet-context.tsx:30:    rpId: string;
    artifacts/ausd-wallet/state/wallet-context.tsx:159:      if (profile.mode !== 'mera') throw new Error('A Mera passkey account is required.');
    artifacts/ausd-wallet/services/savings-pockets.ts:17:  type MeraPasskeyProfile,
    artifacts/ausd-wallet/services/savings-pockets.ts:19:} from '@/services/passkey';
    artifacts/ausd-wallet/services/savings-pockets.ts:248:  account: MeraPasskeyProfile,
    artifacts/ausd-wallet/services/savings-pockets.ts:319:  account: MeraPasskeyProfile,
    artifacts/ausd-wallet/services/savings-pockets.ts:365:  account: MeraPasskeyProfile,
    artifacts/ausd-wallet/services/savings-pockets.ts:433:  account: MeraPasskeyProfile,
    artifacts/ausd-wallet/services/savings-pockets.ts:471:export function giftToPersonSponsored(account: MeraPasskeyProfile, recipient: string, amount: string) {
    artifacts/ausd-wallet/services/savings-pockets.ts:475:export function giftToPocketSponsored(account: MeraPasskeyProfile, recipient: string, pocketId: string, amount: string) {
    artifacts/ausd-wallet/services/savings-pockets.ts:479:export async function withdrawGiftSponsored(account: MeraPasskeyProfile, amount: string) {
    artifacts/ausd-wallet/server/serve.js:86:function servePasskeyAssociation(pathname, res) {
    artifacts/ausd-wallet/server/serve.js:89:    const teamId = process.env.AUSD_IOS_TEAM_ID;
    artifacts/ausd-wallet/server/serve.js:90:    const bundleId = process.env.AUSD_IOS_BUNDLE_ID || 'com.ausd.wallet';
    artifacts/ausd-wallet/server/serve.js:93:      res.end(JSON.stringify({ error: 'Set AUSD_IOS_TEAM_ID to publish the iOS passkey association.' }));
    artifacts/ausd-wallet/server/serve.js:101:  } else if (pathname === '/.well-known/assetlinks.json') {
    artifacts/ausd-wallet/server/serve.js:102:    const packageName = process.env.AUSD_ANDROID_PACKAGE || 'com.ausd.wallet';
    artifacts/ausd-wallet/server/serve.js:103:    const fingerprints = (process.env.AUSD_ANDROID_SHA256_CERT_FINGERPRINTS || '')
    artifacts/ausd-wallet/server/serve.js:109:      res.end(JSON.stringify({ error: 'Set AUSD_ANDROID_SHA256_CERT_FINGERPRINTS to publish Android passkey associations.' }));
    artifacts/ausd-wallet/server/serve.js:118:        target: { namespace: 'android_app', package_name: packageName, sha256_cert_fingerprints: fingerprints },
    artifacts/ausd-wallet/server/serve.js:180:  if (servePasskeyAssociation(pathname, res)) return;
    artifacts/ausd-wallet/server/serve.js:188:    if (platform === 'ios' || platform === 'android') {
    artifacts/ausd-wallet/components/ErrorFallback.tsx:45:    ios: 'Menlo',
    artifacts/ausd-wallet/components/ErrorFallback.tsx:46:    android: 'monospace',
    artifacts/ausd-wallet/services/passkey.ts:23:import type { PasskeyCredentialMetadata } from '@category-labs/mera';
    artifacts/ausd-wallet/services/passkey.ts:36:  credential: PasskeyCredentialMetadata;
    artifacts/ausd-wallet/services/passkey.ts:37:  rpId: string;
    artifacts/ausd-wallet/services/passkey.ts:40:export interface MeraPasskeyProfile {
    artifacts/ausd-wallet/services/passkey.ts:43:  credential: PasskeyCredentialMetadata;
    artifacts/ausd-wallet/services/passkey.ts:44:  rpId: string;
    artifacts/ausd-wallet/services/passkey.ts:68:export function getPasskeyErrorMessage(error: unknown) {
    artifacts/ausd-wallet/services/passkey.ts:69:  if (!(error instanceof Error)) return 'Passkey authentication did not complete. Please try again.';
    artifacts/ausd-wallet/services/passkey.ts:78:    return 'The passkey was created, but this authenticator did not provide Mera’s secure account key. Try a device passkey provider that supports WebAuthn PRF, such as Google Password Manager or iCloud Keychain.';
    artifacts/ausd-wallet/services/passkey.ts:83:  if (shaped.code === 'PASSKEY_OPERATION_FAILED') {
    artifacts/ausd-wallet/services/passkey.ts:84:    const rpId = getRelyingPartyId();
    artifacts/ausd-wallet/services/passkey.ts:85:    return `The passkey ceremony could not finish for RP domain ${rpId ?? 'the configured domain'}. Check that the app’s RP domain has the matching Android assetlinks.json or iOS apple-app-site-association file, then retry.`;
    artifacts/ausd-wallet/services/passkey.ts:88:    return 'Passkey prompt cancelled. You can try again when you’re ready.';
    artifacts/ausd-wallet/services/passkey.ts:90:  return error.message || 'Passkey authentication did not complete. Please try again.';
    artifacts/ausd-wallet/services/passkey.ts:93:async function assertNativeRpAssociation(rpId: string) {
    artifacts/ausd-wallet/services/passkey.ts:95:  const isAndroid = Platform.OS === 'android';
    artifacts/ausd-wallet/services/passkey.ts:96:  const associationPath = isAndroid
    artifacts/ausd-wallet/services/passkey.ts:97:    ? '/.well-known/assetlinks.json'
    artifacts/ausd-wallet/services/passkey.ts:101:    response = await fetch(`https://${rpId}${associationPath}`, { redirect: 'manual' });
    artifacts/ausd-wallet/services/passkey.ts:103:    throw new Error(`Could not reach https://${rpId}${associationPath}. Publish the native passkey association file on the RP domain, then retry.`);
    artifacts/ausd-wallet/services/passkey.ts:106:    throw new Error(`The passkey association file at https://${rpId}${associationPath} must return JSON directly with HTTP 200. Check the RP domain’s association configuration.`);
    artifacts/ausd-wallet/services/passkey.ts:113:    throw new Error(`The passkey association file at https://${rpId}${associationPath} did not return valid JSON.`);
    artifacts/ausd-wallet/services/passkey.ts:116:  if (isAndroid) {
    artifacts/ausd-wallet/services/passkey.ts:117:    const packageName = Constants.expoConfig?.android?.package ?? 'com.ausd.wallet';
    artifacts/ausd-wallet/services/passkey.ts:123:        target?: { namespace?: string; package_name?: string; sha256_cert_fingerprints?: unknown };
    artifacts/ausd-wallet/services/passkey.ts:128:        && target?.namespace === 'android_app'
    artifacts/ausd-wallet/services/passkey.ts:129:        && target.package_name === packageName
    artifacts/ausd-wallet/services/passkey.ts:134:      throw new Error(`Android passkeys are not associated with ${packageName}. Add the installed APK’s signing-certificate SHA-256 fingerprint to the RP domain’s assetlinks.json, then rebuild and retry.`);
    artifacts/ausd-wallet/services/passkey.ts:139:  const iosBundleId = Constants.expoConfig?.ios?.bundleIdentifier;
    artifacts/ausd-wallet/services/passkey.ts:142:  if (iosBundleId && !apps.some((app) => typeof app === 'string' && app.endsWith(`.${iosBundleId}`))) {
    artifacts/ausd-wallet/services/passkey.ts:143:    throw new Error(`iOS passkeys are not associated with ${iosBundleId}. Add the Apple team and bundle ID to the RP domain’s apple-app-site-association file, then rebuild and retry.`);
    artifacts/ausd-wallet/services/passkey.ts:151:  const configured = process.env.EXPO_PUBLIC_RP_ID || process.env.EXPO_PUBLIC_DOMAIN;
    artifacts/ausd-wallet/services/passkey.ts:163:      'Expo Go does not include Mera’s native passkey module. Install the AUSD development build, then open this project with the dev:client command.',
    artifacts/ausd-wallet/services/passkey.ts:166:  if (Platform.OS === 'ios' && Number(Platform.Version) < 18) {
    artifacts/ausd-wallet/services/passkey.ts:167:    throw new Error('Mera passkey accounts require iOS 18 or later.');
    artifacts/ausd-wallet/services/passkey.ts:169:  if (Platform.OS === 'android' && Number(Platform.Version) < 28) {
    artifacts/ausd-wallet/services/passkey.ts:170:    throw new Error('Mera passkey accounts require Android 9 or later.');
    artifacts/ausd-wallet/services/passkey.ts:173:    const { Passkey } = await import('react-native-passkey');
    artifacts/ausd-wallet/services/passkey.ts:174:    if (!Passkey.isSupported()) {
    artifacts/ausd-wallet/services/passkey.ts:175:      throw new Error('Passkeys are not available on this device. Try a supported device with a screen lock enabled.');
    artifacts/ausd-wallet/services/passkey.ts:179:    throw new Error('This browser does not support passkeys. Try a supported browser.');
    artifacts/ausd-wallet/services/passkey.ts:183:async function getNativeWebAuthnClient() {
    artifacts/ausd-wallet/services/passkey.ts:186:    : (await import('@category-labs/mera/react-native-webauthn-client'))
    artifacts/ausd-wallet/services/passkey.ts:187:        .reactNativeWebAuthnClient;
    artifacts/ausd-wallet/services/passkey.ts:221:export async function createMeraPasskey(name: string, email: string): Promise<MeraAccount> {
    artifacts/ausd-wallet/services/passkey.ts:223:  const rpId = getRelyingPartyId();
    artifacts/ausd-wallet/services/passkey.ts:224:  if (!rpId) {
    artifacts/ausd-wallet/services/passkey.ts:226:      'Passkey setup needs a verified HTTPS domain. Configure EXPO_PUBLIC_RP_ID and publish the iOS and Android domain association files for that domain.',
    artifacts/ausd-wallet/services/passkey.ts:229:  await assertNativeRpAssociation(rpId);
    artifacts/ausd-wallet/services/passkey.ts:232:  const webAuthnClient = await getNativeWebAuthnClient();
    artifacts/ausd-wallet/services/passkey.ts:233:  const created = await mera.createPasskeyWithPrfOutput({
    artifacts/ausd-wallet/services/passkey.ts:234:    rp: { id: rpId, name: 'AUSD Wallet' },
    artifacts/ausd-wallet/services/passkey.ts:236:    ...(webAuthnClient ? { webAuthnClient } : {}),
    artifacts/ausd-wallet/services/passkey.ts:245:      rpId,
    artifacts/ausd-wallet/services/passkey.ts:257: * Recover an account from any discoverable passkey synced to this RP.
    artifacts/ausd-wallet/services/passkey.ts:259: * passkey instead of requiring a profile from the previous device.
    artifacts/ausd-wallet/services/passkey.ts:261:export async function recoverMeraPasskey(): Promise<MeraAccount> {
    artifacts/ausd-wallet/services/passkey.ts:263:  const rpId = getRelyingPartyId();
    artifacts/ausd-wallet/services/passkey.ts:264:  if (!rpId) {
    artifacts/ausd-wallet/services/passkey.ts:266:      'Account recovery needs the same verified HTTPS domain used when the passkey was created. Configure EXPO_PUBLIC_RP_ID and publish the native association files for that domain.',
    artifacts/ausd-wallet/services/passkey.ts:269:  await assertNativeRpAssociation(rpId);
    artifacts/ausd-wallet/services/passkey.ts:272:  const webAuthnClient = await getNativeWebAuthnClient();
    artifacts/ausd-wallet/services/passkey.ts:273:  const recovered = await mera.getPasskeyPrfOutput({
    artifacts/ausd-wallet/services/passkey.ts:274:    rpId,
    artifacts/ausd-wallet/services/passkey.ts:275:    ...(webAuthnClient ? { webAuthnClient } : {}),
    artifacts/ausd-wallet/services/passkey.ts:283:      rpId,
    artifacts/ausd-wallet/services/passkey.ts:291:export async function getMeraViemSigner(account: MeraPasskeyProfile) {
    artifacts/ausd-wallet/services/passkey.ts:294:  const webAuthnClient = await getNativeWebAuthnClient();
    artifacts/ausd-wallet/services/passkey.ts:295:  const { prfOutput } = await mera.getPasskeyPrfOutput({
    artifacts/ausd-wallet/services/passkey.ts:296:    rpId: account.rpId,
    artifacts/ausd-wallet/services/passkey.ts:298:    ...(webAuthnClient ? { webAuthnClient } : {}),
    artifacts/ausd-wallet/services/passkey.ts:303:    throw new Error('This passkey does not match the wallet saved on this device.');
    artifacts/ausd-wallet/services/passkey.ts:309:export async function encryptWithMeraPasskey(account: MeraPasskeyProfile, value: string) {
    artifacts/ausd-wallet/services/passkey.ts:311:  const webAuthnClient = await getNativeWebAuthnClient();
    artifacts/ausd-wallet/services/passkey.ts:314:    return await mera.createSecretVaultWithExistingPasskey({
    artifacts/ausd-wallet/services/passkey.ts:315:      rpId: account.rpId,
    artifacts/ausd-wallet/services/passkey.ts:318:      ...(webAuthnClient ? { webAuthnClient } : {}),
    artifacts/ausd-wallet/services/passkey.ts:326:export async function decryptWithMeraPasskey(account: MeraPasskeyProfile, vault: unknown) {
    artifacts/ausd-wallet/services/passkey.ts:328:  const webAuthnClient = await getNativeWebAuthnClient();
    artifacts/ausd-wallet/services/passkey.ts:329:  const plaintext = await mera.decryptSecretVaultWithPasskey({
    artifacts/ausd-wallet/services/passkey.ts:330:    rpId: account.rpId,
    artifacts/ausd-wallet/services/passkey.ts:332:    ...(webAuthnClient ? { webAuthnClient } : {}),
    artifacts/ausd-wallet/services/passkey.ts:341:export async function authenticateMeraPasskey(account: MeraPasskeyProfile): Promise<string> {
    artifacts/ausd-wallet/services/passkey.ts:346:      throw new Error('This passkey smart account does not match the wallet saved on this device.');
    artifacts/ausd-wallet/services/passkey.ts:397:  account: MeraPasskeyProfile,
    artifacts/ausd-wallet/services/passkey.ts:409:      throw new Error('The passkey-derived smart account changed. Stop and restore the matching wallet before signing.');
    artifacts/ausd-wallet/services/passkey.ts:444:  account: MeraPasskeyProfile,
    artifacts/ausd-wallet/services/passkey.ts:452:  account: MeraPasskeyProfile,
    artifacts/ausd-wallet/services/passkey.ts:475:      throw new Error('The passkey-derived smart account changed. Stop and restore the matching wallet before sending.');
    artifacts/ausd-wallet/services/passkey.ts:514:  account: MeraPasskeyProfile,
    artifacts/ausd-wallet/services/passkey.ts:549:      throw new Error('The passkey-derived smart account changed. Stop and restore the matching wallet before sending.');
    artifacts/ausd-wallet/scripts/build.js:87:    path.join(staticBuild, timestamp, '_expo', 'static', 'js', 'ios'),
    artifacts/ausd-wallet/scripts/build.js:88:    path.join(staticBuild, timestamp, '_expo', 'static', 'js', 'android'),
    artifacts/ausd-wallet/scripts/build.js:89:    path.join(staticBuild, 'ios'),
    artifacts/ausd-wallet/scripts/build.js:90:    path.join(staticBuild, 'android'),
    artifacts/ausd-wallet/scripts/build.js:292:    await downloadBundle('ios', timestamp);
    artifacts/ausd-wallet/scripts/build.js:293:    await downloadBundle('android', timestamp);
    artifacts/ausd-wallet/scripts/build.js:295:    const [iosManifest, androidManifest] = await Promise.all([
    artifacts/ausd-wallet/scripts/build.js:296:      downloadManifest('ios'),
    artifacts/ausd-wallet/scripts/build.js:297:      downloadManifest('android'),
    artifacts/ausd-wallet/scripts/build.js:301:    return { ios: iosManifest, android: androidManifest };
    artifacts/ausd-wallet/scripts/build.js:310:    ios: fs.readFileSync(
    artifacts/ausd-wallet/scripts/build.js:317:        'ios',
    artifacts/ausd-wallet/scripts/build.js:322:    android: fs.readFileSync(
    artifacts/ausd-wallet/scripts/build.js:329:        'android',
    artifacts/ausd-wallet/scripts/build.js:371:  extractFromBundle(bundles.ios, 'ios');
    artifacts/ausd-wallet/scripts/build.js:372:  extractFromBundle(bundles.android, 'android');
    artifacts/ausd-wallet/scripts/build.js:477:  updateForPlatform('ios');
    artifacts/ausd-wallet/scripts/build.js:478:  updateForPlatform('android');
    artifacts/ausd-wallet/scripts/build.js:497:    manifest.extra.expoGo.packagerOpts.dev = false;
    artifacts/ausd-wallet/scripts/build.js:519:  updateForPlatform('ios', manifests.ios);
    artifacts/ausd-wallet/scripts/build.js:520:  updateForPlatform('android', manifests.android);
    artifacts/ausd-wallet/services/contacts.ts:2:import type { PasskeySecretVault } from '@category-labs/mera';
    artifacts/ausd-wallet/services/contacts.ts:4:import type { MeraPasskeyProfile } from '@/services/passkey';
    artifacts/ausd-wallet/services/contacts.ts:5:import { decryptWithMeraPasskey, encryptWithMeraPasskey } from '@/services/passkey';
    artifacts/ausd-wallet/services/contacts.ts:49:export async function loadContacts(account: MeraPasskeyProfile): Promise<WalletContact[]> {
    artifacts/ausd-wallet/services/contacts.ts:52:  const plaintext = await decryptWithMeraPasskey(account, JSON.parse(serialized));
    artifacts/ausd-wallet/services/contacts.ts:56:export async function saveContacts(account: MeraPasskeyProfile, contacts: WalletContact[]) {
    artifacts/ausd-wallet/services/contacts.ts:58:  const vault: PasskeySecretVault = await encryptWithMeraPasskey(account, JSON.stringify(validContacts));
    artifacts/ausd-wallet/services/contacts.ts:66:export async function importContactsVault(account: MeraPasskeyProfile, serialized: string) {
    artifacts/ausd-wallet/services/contacts.ts:68:  const plaintext = await decryptWithMeraPasskey(account, vault);
    artifacts/ausd-wallet/app/create-account.tsx:7:import { createMeraPasskey, getPasskeyErrorMessage, recoverMeraPasskey } from '@/services/passkey';
    artifacts/ausd-wallet/app/create-account.tsx:40:      const account = await createMeraPasskey(displayName.trim(), email.trim());
    artifacts/ausd-wallet/app/create-account.tsx:47:        passkey: { credential: account.credential, rpId: account.rpId },
    artifacts/ausd-wallet/app/create-account.tsx:51:      setError(getPasskeyErrorMessage(caught));
    artifacts/ausd-wallet/app/create-account.tsx:75:      const account = await recoverMeraPasskey();
    artifacts/ausd-wallet/app/create-account.tsx:82:        passkey: { credential: account.credential, rpId: account.rpId },
    artifacts/ausd-wallet/app/create-account.tsx:86:      setError(getPasskeyErrorMessage(caught));
    artifacts/ausd-wallet/app/create-account.tsx:102:          <Text style={[styles.body, { color: colors.mutedForeground }]}>Create a new Mera passkey account, or recover an existing account from a passkey synced to this device.</Text>
    artifacts/ausd-wallet/app/create-account.tsx:106:          <Text style={[styles.securityText, { color: colors.mutedForeground }]}>Recovery must use the same RP domain and a passkey provider that supports WebAuthn PRF.</Text>
    artifacts/ausd-wallet/app/create-account.tsx:127:        <Text style={[styles.body, { color: colors.mutedForeground }]}>{isRecovery ? 'Choose your synced Mera passkey, then add the name and email you want to use on this device.' : 'Add your details, then create a passkey to protect your wallet.'}</Text>
    artifacts/ausd-wallet/app/create-account.tsx:135:        <Text style={[styles.securityText, { color: colors.mutedForeground }]}>Mera uses your device security: fingerprint, face, or screen lock. The passkey approves sends; there’s no separate password.</Text>
    artifacts/ausd-wallet/app/create-account.tsx:139:        <PrimaryButton label={isRecovery ? 'Recover with passkey' : 'Create passkey'} icon="key" loading={busy} onPress={isRecovery ? recoverAccount : createAccount} testID={isRecovery ? 'recover-passkey' : 'create-passkey'} />
    artifacts/ausd-wallet/app/savings-goals.tsx:7:import { getAUSDBalance } from '@/services/passkey';
    artifacts/ausd-wallet/app/savings-goals.tsx:58:  const account = profile?.mode === 'mera' && profile.address && profile.signerAddress && profile.passkey
    artifacts/ausd-wallet/app/savings-goals.tsx:59:    ? { address: profile.address, signerAddress: profile.signerAddress, credential: profile.passkey.credential, rpId: profile.passkey.rpId }
    artifacts/ausd-wallet/app/savings-goals.tsx:109:  }, [account?.address, account?.signerAddress, account?.rpId, account?.credential.credentialId]);
    artifacts/ausd-wallet/app/savings-goals.tsx:155:          { text: 'Confirm with passkey', onPress: () => resolve(true) },
    artifacts/ausd-wallet/app/savings-goals.tsx:245:      Alert.alert('Savings pocket ready', `${txNote} No AUSD moved. Your plan is encrypted with your Mera passkey.`);
    artifacts/ausd-wallet/app/savings-goals.tsx:329:      Alert.alert('Plan restored', 'Your encrypted savings plan was opened with your Mera passkey.');
    artifacts/ausd-wallet/app/savings-goals.tsx:345:      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Make a plan, set aside AUSD, and track your progress with your passkey.</Text>
    artifacts/ausd-wallet/app/savings-goals.tsx:348:        <InlineNotice icon="key">Savings plans are protected by Mera. Create or unlock a Mera passkey wallet to get started.</InlineNotice>
    artifacts/ausd-wallet/app/savings-goals.tsx:513:          <Text style={[styles.privacy, { color: colors.mutedForeground }]}>Goal labels are encrypted on this device; pocket balances and transactions are read from Monad testnet. Your passkey can recreate the decryption key on another supported device.</Text>
    artifacts/ausd-wallet/app/savings-goals.tsx:516:            <Text style={[styles.summaryMeta, { color: colors.mutedForeground }]}>Share or copy this encrypted backup, then restore it on a device with the same passkey and app domain.</Text>
    artifacts/ausd-wallet/app/savings-goals.tsx:534:              <PrimaryButton label="Restore with passkey" icon="key" loading={saving} onPress={() => void restoreBackup()} />
    artifacts/ausd-wallet/app/receive.tsx:65:        <Body>Share a request. The sender reviews the details and approves with their passkey.</Body>
    artifacts/ausd-wallet/app/receive.tsx:70:          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Create a passkey wallet first</Text>
    artifacts/ausd-wallet/app/review.tsx:12:} from '@/services/passkey';
    artifacts/ausd-wallet/app/review.tsx:72:    if (profile.mode !== 'mera' || !profile.address || !profile.signerAddress || !profile.passkey) {
    artifacts/ausd-wallet/app/review.tsx:73:      setError('A Mera passkey wallet is required to send AUSD. Demo wallets cannot submit transactions.');
    artifacts/ausd-wallet/app/review.tsx:90:        credential: profile.passkey.credential,
    artifacts/ausd-wallet/app/review.tsx:91:        rpId: profile.passkey.rpId,
    artifacts/ausd-wallet/app/review.tsx:241:      {settlement ? <Text style={[styles.firstTimeNote, { color: colors.mutedForeground }]}>First use may enable this testnet wallet and approve the pair. One passkey approval covers the sponsored batch.</Text> : null}
    artifacts/ausd-wallet/app/review.tsx:247:            <Text style={[styles.networkCaption, { color: colors.mutedForeground }]}>Approve with your passkey, then we’ll wait for Monad testnet to confirm.</Text>
    artifacts/ausd-wallet/app/review.tsx:268:      <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>Passkey approval required · Monad testnet only</Text>
    artifacts/ausd-wallet/app/index.tsx:7:import { authenticateMeraPasskey, getPasskeyErrorMessage } from '@/services/passkey';
    artifacts/ausd-wallet/app/index.tsx:20:  { eyebrow: 'YOUR PASSKEY IS YOUR KEY', title: 'A wallet made for your phone.', copy: 'Mera uses your device passkey to create and unlock your account. No seed phrase to copy or manage.', icon: 'key' as const, accent: 'Mera', detail: 'Face · fingerprint · screen lock' },
    artifacts/ausd-wallet/app/index.tsx:39:  async function continueWithPasskey() {
    artifacts/ausd-wallet/app/index.tsx:41:    if (!profile || profile.mode !== 'mera' || !profile.address || !profile.signerAddress || !profile.passkey) {
    artifacts/ausd-wallet/app/index.tsx:47:      await authenticateMeraPasskey({
    artifacts/ausd-wallet/app/index.tsx:50:        credential: profile.passkey.credential,
    artifacts/ausd-wallet/app/index.tsx:51:        rpId: profile.passkey.rpId,
    artifacts/ausd-wallet/app/index.tsx:56:      setError(getPasskeyErrorMessage(caught));
    artifacts/ausd-wallet/app/index.tsx:101:            <Eyebrow>PASSKEY ACCOUNT</Eyebrow>
    artifacts/ausd-wallet/app/index.tsx:105:          <PrimaryButton label="Continue with passkey" icon="key" loading={busy} onPress={continueWithPasskey} testID="continue-passkey" />
    artifacts/ausd-wallet/app/index.tsx:140:          <InlineNotice icon="shield">Your Mera passkey is created after the introduction, on the account setup screen.</InlineNotice>
    artifacts/ausd-wallet/app/contacts.tsx:23:  const account = useMemo(() => profile?.mode === 'mera' && profile.address && profile.signerAddress && profile.passkey
    artifacts/ausd-wallet/app/contacts.tsx:24:    ? { address: profile.address, signerAddress: profile.signerAddress, credential: profile.passkey.credential, rpId: profile.passkey.rpId }
    artifacts/ausd-wallet/app/contacts.tsx:54:      Alert.alert('Contacts protected', 'Your contacts are encrypted with your Mera passkey.');
    artifacts/ausd-wallet/app/contacts.tsx:101:      Alert.alert('Contacts restored', 'Your encrypted contacts were opened with your Mera passkey.');
    artifacts/ausd-wallet/app/contacts.tsx:119:      {!account ? <InlineNotice icon="key">Create or unlock a Mera passkey wallet to use encrypted contacts.</InlineNotice> : <>
    artifacts/ausd-wallet/app/contacts.tsx:126:          <PrimaryButton label="Save contact with passkey" icon="lock" loading={saving} onPress={addContact} />
    artifacts/ausd-wallet/app/contacts.tsx:155:          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Share or copy the encrypted backup, then restore it with the same passkey and app domain.</Text>
    artifacts/ausd-wallet/app/contacts.tsx:163:            <PrimaryButton label="Restore with passkey" icon="key" loading={saving} onPress={() => void restoreBackup()} />
    artifacts/ausd-wallet/app/send.tsx:20:import { getTokenBalance } from '@/services/passkey';
    artifacts/ausd-wallet/app/send.tsx:103:      setError(`Create a Mera passkey wallet to send testnet ${sendMode === 'settlement' ? 'AUSD' : token}.`);
    artifacts/ausd-wallet/app/send.tsx:106:    if (!profile.address || !profile.signerAddress || !profile.passkey) {
    artifacts/ausd-wallet/app/send.tsx:107:      setError('This passkey wallet needs to be set up again before it can send.');
    artifacts/ausd-wallet/app/send.tsx:157:        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    artifacts/ausd-wallet/app/scan.tsx:81:      <InlineNotice icon="shield">Check the recipient and amount on the review screen before approving with your passkey.</InlineNotice>
    artifacts/ausd-wallet/app/swap.tsx:7:import { getTokenBalance } from '@/services/passkey';
    artifacts/ausd-wallet/app/swap.tsx:64:  const canReview = profile?.mode === 'mera' && Boolean(profile.address && profile.signerAddress && profile.passkey) && Boolean(quote) && !loading && balance !== null && inputAmountValid && amountIn <= balance;
    artifacts/ausd-wallet/app/swap.tsx:102:        <Body>Trade the live AUSD/CTK pair. Your passkey approves the swap on Monad testnet.</Body>
    artifacts/ausd-wallet/app/swap.tsx:148:      {profile?.mode !== 'mera' ? <InlineNotice icon="info">Create a Mera passkey wallet to request and approve an on-chain swap. Demo wallets cannot submit transactions.</InlineNotice> : null}
    artifacts/ausd-wallet/app/aurora-deposit.tsx:78:    if (!profile?.address || profile.mode !== 'mera') return setQuoteError('Set up a Mera passkey wallet before creating a cross-chain deposit.');
    artifacts/ausd-wallet/app/aurora-deposit.tsx:132:      {profile?.mode !== 'mera' ? <InlineNotice icon="info">A Mera passkey wallet is required as the Monad AUSD destination.</InlineNotice> : null}
    artifacts/ausd-wallet/app/(tabs)/index.tsx:7:import { getAUSDBalance, getUSDCBalance } from '@/services/passkey';
    artifacts/ausd-wallet/app/(tabs)/index.tsx:181:          <Text style={[styles.goalSubtitle, { color: colors.mutedForeground }]}>Plan privately with your Mera passkey</Text>
    artifacts/ausd-wallet/app/(tabs)/_layout.tsx:11:// IMPORTANT: iOS 26 uses NativeTabs for native tabs with liquid glass support.
    artifacts/ausd-wallet/app/(tabs)/_layout.tsx:13:// is a system-level appearance provided by iOS and cannot be overridden.
    artifacts/ausd-wallet/app/(tabs)/_layout.tsx:14:// Custom brand colors are applied only on the ClassicTabLayout path (older iOS / Android / web).
    artifacts/ausd-wallet/app/(tabs)/_layout.tsx:48:  const isIOS = Platform.OS === 'ios';
    artifacts/ausd-wallet/app/(tabs)/_layout.tsx:57:        // navigator must not add a second title bar above the Android tabs.
    artifacts/ausd-wallet/app/(tabs)/_layout.tsx:61:          backgroundColor: isIOS ? 'transparent' : colors.background,
    artifacts/ausd-wallet/app/(tabs)/_layout.tsx:68:          isIOS ? (
    artifacts/ausd-wallet/app/(tabs)/_layout.tsx:89:            isIOS ? (
    artifacts/ausd-wallet/app/(tabs)/profile.tsx:83:            {profile?.mode === 'mera' ? 'PASSKEY' : 'DEMO'}
    artifacts/ausd-wallet/app/(tabs)/send.tsx:8:import { getAUSDBalance } from '@/services/passkey';
    artifacts/ausd-wallet/app/(tabs)/send.tsx:205:        Demo wallets cannot send. A Mera passkey smart account and a funded Monad testnet AUSD balance are required.
    ✓ • 110ms

## Activity

    $ sed -n '1,210p' artifacts/ausd-wallet/services/passkey.ts && sed -n '1,155p' artifacts/ausd-wallet/app.config.ts && sed -n '75,132p' artifacts/ausd-wallet/server/serve.js && sed -n '1,80p' artifacts/ausd-wallet/app.json && sed -n '1,100p' artifacts/ausd-wallet/package.json && rg -n "EXPO_PUBLIC_RP_ID|AUSD_ANDROID_PACKAGE|AUSD_ANDROID_SHA256_CERT_FINGERPRINTS|auth\.vic-ezealor" -S --glob '!**/node_modules/**' .
    import { Platform } from 'react-native';
    import Constants, { AppOwnership } from 'expo-constants';
    import { HDKey } from '@scure/bip32';
    import { entropyToMnemonic, mnemonicToSeedSync } from '@scure/bip39';
    import { wordlist } from '@scure/bip39/wordlists/english.js';
    import { toViemAccount } from '@category-labs/mera/viem';
    import { toKernelSmartAccount } from 'permissionless/accounts';
    import { createSmartAccountClient } from 'permissionless';
    import {
      createPublicClient,
      decodeEventLog,
      defineChain,
      encodeFunctionData,
      formatUnits,
      http,
      isAddress,
      parseUnits,
      type Address,
      type Hex,
    } from 'viem';
    import { entryPoint07Address } from 'viem/account-abstraction';
    import { createPaymasterClient } from 'viem/account-abstraction';
    import type { PasskeyCredentialMetadata } from '@category-labs/mera';
    import {
      AGORA_TESTNET_WHITELISTER,
      MONAD_TESTNET,
      pairAbi,
      simulateTokenSwap,
      whitelisterAbi,
    } from '@/services/settlement';
    import { WALLET_TOKENS, type WalletToken } from '@/services/tokens';
    
    export interface MeraAccount {
      address: string;
      signerAddress: string;
      credential: PasskeyCredentialMetadata;
      rpId: string;
    }
    
    export interface MeraPasskeyProfile {
      address: string;
      signerAddress: string;
      credential: PasskeyCredentialMetadata;
      rpId: string;
    }
    
    export const MONAD_CHAIN = defineChain({
      id: 10143,
      name: 'Monad Testnet',
      nativeCurrency: { name: 'Monad', symbol: 'MON', decimals: 18 },
      rpcUrls: { default: { http: [MONAD_TESTNET.rpcUrl] } },
    });
    
    const publicClient = createPublicClient({ chain: MONAD_CHAIN, transport: http(MONAD_TESTNET.rpcUrl) });
    const entryPoint = { address: entryPoint07Address, version: '0.7' as const };
    const ausdAbi = [
      { type: 'function', name: 'decimals', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
      { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
      { type: 'function', name: 'allowance', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ type: 'uint256' }] },
      { type: 'function', name: 'approve', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
      { type: 'function', name: 'transfer', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
    ] as const;
    const balanceAbi = [
      { type: 'function', name: 'decimals', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
      { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
    ] as const;
    
    export function getPasskeyErrorMessage(error: unknown) {
      if (!(error instanceof Error)) return 'Passkey authentication did not complete. Please try again.';
      const shaped = error as Error & { code?: string; cause?: unknown };
      const cause = shaped.cause as { error?: unknown; message?: unknown; code?: unknown } | undefined;
      const causeText = [cause?.error, cause?.message, cause?.code]
        .filter((part): part is string => typeof part === 'string')
        .join(' ')
        .toLowerCase();
    
      if (shaped.code === 'PRF_UNAVAILABLE') {
        return 'The passkey was created, but this authenticator did not provide Mera’s secure account key. Try a device passkey provider that supports WebAuthn PRF, such as Google Password Manager or iCloud Keychain.';
      }
      if (shaped.code === 'CRYPTO_UNAVAILABLE') {
        return 'Secure cryptography is unavailable in this app runtime. Update the app and try again.';
      }
      if (shaped.code === 'PASSKEY_OPERATION_FAILED') {
        const rpId = getRelyingPartyId();
        return `The passkey ceremony could not finish for RP domain ${rpId ?? 'the configured domain'}. Check that the app’s RP domain has the matching Android assetlinks.json or iOS apple-app-site-association file, then retry.`;
      }
      if (causeText.includes('cancel')) {
        return 'Passkey prompt cancelled. You can try again when you’re ready.';
      }
      return error.message || 'Passkey authentication did not complete. Please try again.';
    }
    
    async function assertNativeRpAssociation(rpId: string) {
      if (Platform.OS === 'web') return;
      const isAndroid = Platform.OS === 'android';
      const associationPath = isAndroid
        ? '/.well-known/assetlinks.json'
        : '/.well-known/apple-app-site-association';
      let response: Response;
      try {
        response = await fetch(`https://${rpId}${associationPath}`, { redirect: 'manual' });
      } catch {
        throw new Error(`Could not reach https://${rpId}${associationPath}. Publish the native passkey association file on the RP domain, then retry.`);
      }
      if (!response.ok || response.redirected) {
        throw new Error(`The passkey association file at https://${rpId}${associationPath} must return JSON directly with HTTP 200. Check the RP domain’s association configuration.`);
      }
    
      let association: unknown;
      try {
        association = await response.json();
      } catch {
        throw new Error(`The passkey association file at https://${rpId}${associationPath} did not return valid JSON.`);
      }
    
      if (isAndroid) {
        const packageName = Constants.expoConfig?.android?.package ?? 'com.ausd.wallet';
        const entries = Array.isArray(association) ? association : [];
        const appIsAssociated = entries.some((entry) => {
          if (!entry || typeof entry !== 'object') return false;
          const typedEntry = entry as {
            relation?: unknown;
            target?: { namespace?: string; package_name?: string; sha256_cert_fingerprints?: unknown };
          };
          const relations = Array.isArray(typedEntry.relation) ? typedEntry.relation : [];
          const target = typedEntry.target;
          return relations.includes('delegate_permission/common.get_login_creds')
            && target?.namespace === 'android_app'
            && target.package_name === packageName
            && Array.isArray(target.sha256_cert_fingerprints)
            && target.sha256_cert_fingerprints.length > 0;
        });
        if (!appIsAssociated) {
          throw new Error(`Android passkeys are not associated with ${packageName}. Add the installed APK’s signing-certificate SHA-256 fingerprint to the RP domain’s assetlinks.json, then rebuild and retry.`);
        }
        return;
      }
    
      const iosBundleId = Constants.expoConfig?.ios?.bundleIdentifier;
      const webcredentials = (association as { webcredentials?: { apps?: unknown } } | null)?.webcredentials;
      const apps = Array.isArray(webcredentials?.apps) ? webcredentials.apps : [];
      if (iosBundleId && !apps.some((app) => typeof app === 'string' && app.endsWith(`.${iosBundleId}`))) {
        throw new Error(`iOS passkeys are not associated with ${iosBundleId}. Add the Apple team and bundle ID to the RP domain’s apple-app-site-association file, then rebuild and retry.`);
      }
    }
    
    function getRelyingPartyId() {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        return window.location.hostname;
      }
      const configured = process.env.EXPO_PUBLIC_RP_ID || process.env.EXPO_PUBLIC_DOMAIN;
      if (!configured) return undefined;
      try {
        return new URL(configured.includes('://') ? configured : `https://${configured}`).hostname;
      } catch {
        return undefined;
      }
    }
    
    async function assertPlatformSupport() {
      if (Platform.OS !== 'web' && Constants.appOwnership === AppOwnership.Expo) {
        throw new Error(
          'Expo Go does not include Mera’s native passkey module. Install the AUSD development build, then open this project with the dev:client command.',
        );
      }
      if (Platform.OS === 'ios' && Number(Platform.Version) < 18) {
        throw new Error('Mera passkey accounts require iOS 18 or later.');
      }
      if (Platform.OS === 'android' && Number(Platform.Version) < 28) {
        throw new Error('Mera passkey accounts require Android 9 or later.');
      }
      if (Platform.OS !== 'web') {
        const { Passkey } = await import('react-native-passkey');
        if (!Passkey.isSupported()) {
          throw new Error('Passkeys are not available on this device. Try a supported device with a screen lock enabled.');
        }
      }
      if (Platform.OS === 'web' && typeof window !== 'undefined' && !window.PublicKeyCredential) {
        throw new Error('This browser does not support passkeys. Try a supported browser.');
      }
    }
    
    async function getNativeWebAuthnClient() {
      return Platform.OS === 'web'
        ? undefined
        : (await import('@category-labs/mera/react-native-webauthn-client'))
            .reactNativeWebAuthnClient;
    }
    
    function signerFromPrf(mera: typeof import('@category-labs/mera'), prfOutput: Uint8Array) {
      let session: ReturnType<typeof mera.createSecp256k1SigningSession> | undefined;
      let seed: Uint8Array | undefined;
      let privateKey: Uint8Array | undefined;
      try {
        const mnemonic = entropyToMnemonic(prfOutput, wordlist);
        seed = mnemonicToSeedSync(mnemonic);
        const node = HDKey.fromMasterSeed(seed).derive("m/44'/60'/0'/0/0");
        if (!node.privateKey) throw new Error('Mera could not derive the EVM account key.');
        privateKey = node.privateKey;
        session = mera.createSecp256k1SigningSession({ privateKey });
        return { session, owner: toViemAccount(session) };
      } catch (error) {
        session?.end();
        throw error;
      } finally {
        privateKey?.fill(0);
        seed?.fill(0);
        prfOutput.fill(0);
      }
    }
    import type { ConfigContext } from 'expo/config';
    
    function domainHost(value?: string) {
      if (!value) return undefined;
      try {
        return new URL(value.includes('://') ? value : `https://${value}`).hostname;
      } catch {
        return undefined;
      }
    }
    
    export default ({ config }: ConfigContext) => {
      const rpId = domainHost(process.env.EXPO_PUBLIC_RP_ID || process.env.EXPO_PUBLIC_DOMAIN);
      const bundleIdentifier = process.env.AUSD_IOS_BUNDLE_ID || 'com.ausd.wallet';
      const androidPackage = process.env.AUSD_ANDROID_PACKAGE || 'com.ausd.wallet';
    
      return {
        ...config,
        name: config.name ?? 'AUSD Wallet',
        slug: config.slug ?? 'ausd-wallet',
        version: config.version ?? '1.0.0',
        ios: {
          ...config.ios,
          bundleIdentifier,
          supportsTablet: false,
          ...(rpId ? { associatedDomains: [`webcredentials:${rpId}`] } : {}),
        },
        android: {
          ...config.android,
          package: androidPackage,
          ...(rpId
            ? {
                intentFilters: [
                  {
                    action: 'VIEW',
                    autoVerify: true,
                    data: [{ scheme: 'https', host: rpId }],
                    category: ['BROWSABLE', 'DEFAULT'],
                  },
                ],
              }
            : {}),
        },
      };
    };
      }
    
      const manifest = fs.readFileSync(manifestPath, 'utf-8');
      res.writeHead(200, {
        'content-type': 'application/json',
        'expo-protocol-version': '1',
        'expo-sfv-version': '0',
      });
      res.end(manifest);
    }
    
    function servePasskeyAssociation(pathname, res) {
      let document;
      if (pathname === '/.well-known/apple-app-site-association') {
        const teamId = process.env.AUSD_IOS_TEAM_ID;
        const bundleId = process.env.AUSD_IOS_BUNDLE_ID || 'com.ausd.wallet';
        if (!teamId) {
          res.writeHead(503, { 'content-type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'Set AUSD_IOS_TEAM_ID to publish the iOS passkey association.' }));
          return true;
        }
        document = {
          applinks: {},
          webcredentials: { apps: [`${teamId}.${bundleId}`] },
          appclips: {},
        };
      } else if (pathname === '/.well-known/assetlinks.json') {
        const packageName = process.env.AUSD_ANDROID_PACKAGE || 'com.ausd.wallet';
        const fingerprints = (process.env.AUSD_ANDROID_SHA256_CERT_FINGERPRINTS || '')
          .split(',')
          .map((fingerprint) => fingerprint.trim())
          .filter(Boolean);
        if (fingerprints.length === 0) {
          res.writeHead(503, { 'content-type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'Set AUSD_ANDROID_SHA256_CERT_FINGERPRINTS to publish Android passkey associations.' }));
          return true;
        }
        document = [
          {
            relation: [
              'delegate_permission/common.handle_all_urls',
              'delegate_permission/common.get_login_creds',
            ],
            target: { namespace: 'android_app', package_name: packageName, sha256_cert_fingerprints: fingerprints },
          },
        ];
      } else {
        return false;
      }
    
      res.writeHead(200, {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'public, max-age=300',
      });
      res.end(JSON.stringify(document));
      return true;
    }
    
    {
      "expo": {
        "name": "AUSD Wallet",
        "slug": "ausd-wallet",
        "version": "1.0.0",
        "orientation": "portrait",
        "icon": "./assets/images/icon.png",
        "scheme": "ausd-wallet",
        "userInterfaceStyle": "light",
        "splash": {
          "image": "./assets/images/icon.png",
          "resizeMode": "contain",
          "backgroundColor": "#ffffff"
        },
        "ios": {
          "supportsTablet": false
        },
        "android": {},
        "web": {
          "favicon": "./assets/images/icon.png"
        },
        "plugins": [
          "expo-router",
          "expo-secure-store",
          [
            "expo-camera",
            {
              "cameraPermission": "Allow AUSD Wallet to scan payment requests."
            }
          ]
        ],
        "experiments": {
          "typedRoutes": true,
          "reactCompiler": true
        },
        "extra": {
          "eas": {
            "projectId": "f2e6ac36-6687-432f-a553-d5ba8f970cab"
          }
        }
      }
    }
    {
      "name": "@workspace/ausd-wallet",
      "version": "0.0.0",
      "private": true,
      "main": "expo-router/entry",
      "scripts": {
        "dev": "sh -c 'if [ -n \"$REPLIT_EXPO_SESSION_SECRET\" ]; then pnpm exec create-launch login --session \"$REPLIT_EXPO_SESSION_SECRET\" || true; fi' && EXPO_PACKAGER_PROXY_URL=https://$REPLIT_EXPO_DEV_DOMAIN EXPO_PUBLIC_DOMAIN=$REPLIT_DEV_DOMAIN EXPO_PUBLIC_REPL_ID=$REPL_ID REACT_NATIVE_PACKAGER_HOSTNAME=$REPLIT_DEV_DOMAIN pnpm exec expo start --localhost --port $PORT",
        "dev:client": "expo start --dev-client",
        "build": "node scripts/build.js",
        "serve": "node server/serve.js",
        "typecheck": "tsc -p tsconfig.json --noEmit"
      },
      "devDependencies": {
        "@babel/core": "^7.25.2",
        "@expo-google-fonts/inter": "^0.4.0",
        "@expo/vector-icons": "^15.0.2",
        "@react-native-async-storage/async-storage": "2.2.0",
        "@stardazed/streams-text-encoding": "^1.0.2",
        "@tanstack/react-query": "catalog:",
        "@types/react": "~19.2.2",
        "@types/react-dom": "~19.2.2",
        "@ungap/structured-clone": "^1.3.0",
        "@workspace/api-client-react": "workspace:*",
        "babel-plugin-react-compiler": "^19.0.0-beta-e993439-20250117",
        "create-launch": "0.3.6",
        "expo-blur": "~57.0.2",
        "expo-constants": "~57.0.6",
        "expo-font": "~57.0.1",
        "expo-glass-effect": "~57.0.1",
        "expo-haptics": "~57.0.1",
        "expo-image": "~57.0.1",
        "expo-image-picker": "~57.0.5",
        "expo-linear-gradient": "~57.0.1",
        "expo-linking": "~57.0.3",
        "expo-location": "~57.0.5",
        "expo-router": "~57.0.7",
        "expo-splash-screen": "~57.0.4",
        "expo-status-bar": "~57.0.1",
        "expo-symbols": "~57.0.1",
        "expo-system-ui": "~57.0.1",
        "expo-web-browser": "~57.0.1",
        "react-dom": "19.2.3",
        "react-native-gesture-handler": "~2.32.0",
        "react-native-keyboard-controller": "1.21.9",
        "react-native-reanimated": "4.5.1",
        "react-native-safe-area-context": "~5.7.0",
        "react-native-screens": "~4.26.0",
        "react-native-svg": "15.15.4",
        "react-native-web": "~0.21.0",
        "react-native-worklets": "0.10.1",
        "typescript": "~6.0.3",
        "zod": "catalog:",
        "zod-validation-error": "^3.4.0"
      },
      "dependencies": {
        "@category-labs/mera": "^0.2.0",
        "@scure/bip32": "^2.4.0",
        "@scure/bip39": "^2.4.0",
        "expo": "~57.0.27",
        "expo-camera": "~57.0.6",
        "expo-clipboard": "~57.0.2",
        "expo-crypto": "~57.0.3",
        "expo-dev-client": "~57.0.19",
        "expo-secure-store": "~57.0.4",
        "permissionless": "^0.4.1",
        "react": "19.2.3",
        "react-native": "0.86.3",
        "react-native-passkey": "^3.6.2",
        "react-native-qrcode-svg": "^6.3.26",
        "viem": "^2.57.3"
      }
    }
    ./codex-session-01a1226f-72a5-7360-a0b6-5c3f1e0342.md:722:    Set `EXPO_PUBLIC_RP_ID` to the hostname that will own the passkey. It must be a verified HTTPS domain and match the app’s native domain associations. If omitted, the Expo development domain is used when available. Native builds also accept:
    ./codex-session-01a1226f-72a5-7360-a0b6-5c3f1e0342.md:726:    - `AUSD_ANDROID_PACKAGE` (defaults to `com.ausd.wallet`)
    ./codex-session-01a1226f-72a5-7360-a0b6-5c3f1e0342.md:727:    - `AUSD_ANDROID_SHA256_CERT_FINGERPRINTS`, comma-separated, for Android `assetlinks.json`
    ./codex-session-01a1226f-72a5-7360-a0b6-5c3f1e0342.md:749:    Configure a Codemagic variable group named `ausd_wallet`. Add `EXPO_PUBLIC_ALCHEMY_MONAD_RPC_URL` for Alchemy-backed testnet reads. For passkey use in the installed app, also configure `EXPO_PUBLIC_RP_ID` and the Android package/signing-certificate association values used by the app's `/.well-known/assetlinks.json` endpoint. Download the APK from the Codemagic build artifacts. The existing workflow triggers on pushes to `main`; use Codemagic's manual start action to build another branch.
    ./codex-session-01a1226f-72a5-7360-a0b6-5c3f1e0342.md:755:    To produce an APK configured for the live testnet demo, add repository **Actions secrets** in **Settings → Secrets and variables → Actions**: `EXPO_PUBLIC_RP_ID` and `EXPO_PUBLIC_PIMLICO_BUNDLER_URL` are required by the build workflow. `EXPO_PUBLIC_ALCHEMY_MONAD_RPC_URL` is optional; without it the app uses Monad public testnet RPC. Add `EXPO_PUBLIC_PIMLICO_POLICY_ID` if the Pimlico URL does not select the sponsorship policy. The `EXPO_PUBLIC_*` values are compiled into the APK; use restricted testnet credentials. `AUSD_ANDROID_PACKAGE` can be set as a repository Actions variable; it defaults to `com.ausd.wallet`. Passkey authentication also requires the matching Android asset links file to be published for the RP domain and signing certificate.
    ./codex-session-01a1226f-72a5-7360-a0b6-5c3f1e0342.md:768:    1. Set `EXPO_PUBLIC_RP_ID` to the public HTTPS hostname configured for passkeys, and publish the Android asset links file with the package name and signing certificate SHA-256 fingerprint.
    ./codex-session-01a1226f-72a5-7360-a0b6-5c3f1e0342.md:1055:    .github/workflows/build-android-apk.yml:21:      EXPO_PUBLIC_RP_ID: ${{ secrets.EXPO_PUBLIC_RP_ID }}
    ./codex-session-01a1226f-72a5-7360-a0b6-5c3f1e0342.md:1061:    .github/workflows/build-android-apk.yml:62:          for name in EXPO_PUBLIC_RP_ID EXPO_PUBLIC_PIMLICO_BUNDLER_URL; do
    ./codex-session-01a1226f-72a5-7360-a0b6-5c3f1e0342.md:1080:    artifacts/ausd-wallet/README.md:9:Set `EXPO_PUBLIC_RP_ID` to the hostname that will own the passkey. It must be a verified HTTPS domain and match the app’s native domain associations. If omitted, the Expo development domain is used when available. Native builds also accept:
    ./codex-session-01a1226f-72a5-7360-a0b6-5c3f1e0342.md:1087:    artifacts/ausd-wallet/README.md:36:Configure a Codemagic variable group named `ausd_wallet`. Add `EXPO_PUBLIC_ALCHEMY_MONAD_RPC_URL` for Alchemy-backed testnet reads. For passkey use in the installed app, also configure `EXPO_PUBLIC_RP_ID` and the Android package/signing-certificate association values used by the app's `/.well-known/assetlinks.json` endpoint. Download the APK from the Codemagic build artifacts. The existing workflow triggers on pushes to `main`; use Codemagic's manual start action to build another branch.
    ./codex-session-01a1226f-72a5-7360-a0b6-5c3f1e0342.md:1088:    artifacts/ausd-wallet/README.md:42:To produce an APK configured for the live testnet demo, add repository **Actions secrets** in **Settings → Secrets and variables → Actions**: `EXPO_PUBLIC_RP_ID` and `EXPO_PUBLIC_PIMLICO_BUNDLER_URL` are required by the build workflow. `EXPO_PUBLIC_ALCHEMY_MONAD_RPC_URL` is optional; without it the app uses Monad public testnet RPC. Add `EXPO_PUBLIC_PIMLICO_POLICY_ID` if the Pimlico URL does not select the sponsorship policy. The `EXPO_PUBLIC_*` values are compiled into the APK; use restricted testnet credentials. `AUSD_ANDROID_PACKAGE` can be set as a repository Actions variable; it defaults to `com.ausd.wallet`. Passkey authentication also requires the matching Android asset links file to be published for the RP domain and signing certificate.
    ./codex-session-01a1226f-72a5-7360-a0b6-5c3f1e0342.md:1089:    artifacts/ausd-wallet/README.md:55:1. Set `EXPO_PUBLIC_RP_ID` to the public HTTPS hostname configured for passkeys, and publish the Android asset links file with the package name and signing certificate SHA-256 fingerprint.
    ./codex-session-01a1226f-72a5-7360-a0b6-5c3f1e0342.md:1092:    artifacts/ausd-wallet/app.config.ts:13:  const rpId = domainHost(process.env.EXPO_PUBLIC_RP_ID || process.env.EXPO_PUBLIC_DOMAIN);
    ./codex-session-01a1226f-72a5-7360-a0b6-5c3f1e0342.md:1113:    artifacts/ausd-wallet/services/passkey.ts:143:  const configured = process.env.EXPO_PUBLIC_RP_ID || process.env.EXPO_PUBLIC_DOMAIN;
    ./codex-session-01a1226f-72a5-7360-a0b6-5c3f1e0342.md:1118:    artifacts/ausd-wallet/services/passkey.ts:218:      'Passkey setup needs a verified HTTPS domain. Configure EXPO_PUBLIC_RP_ID and publish the iOS and Android domain association files for that domain.',
    ./codex-session-01a1226f-72a5-7360-a0b6-5c3f1e0342.md:1377:      const configured = process.env.EXPO_PUBLIC_RP_ID || process.env.EXPO_PUBLIC_DOMAIN;
    ./codex-session-01a1226f-72a5-7360-a0b6-5c3f1e0342.md:1452:          'Passkey setup needs a verified HTTPS domain. Configure EXPO_PUBLIC_RP_ID and publish the iOS and Android domain association files for that domain.',
    ./codex-session-01a1226f-72a5-7360-a0b6-5c3f1e0342.md:5024:      const configured = process.env.EXPO_PUBLIC_RP_ID || process.env.EXPO_PUBLIC_DOMAIN;
    ./codex-session-01a1226f-72a5-7360-a0b6-5c3f1e0342.md:5099:          'Passkey setup needs a verified HTTPS domain. Configure EXPO_PUBLIC_RP_ID and publish the iOS and Android domain association files for that domain.',
    ./codex-session-01a1226f-72a5-7360-a0b6-5c3f1e0342.md:8120:      const configured = process.env.EXPO_PUBLIC_RP_ID || process.env.EXPO_PUBLIC_DOMAIN;
    ./codex-session-01a1226f-72a5-7360-a0b6-5c3f1e0342.md:8195:          'Passkey setup needs a verified HTTPS domain. Configure EXPO_PUBLIC_RP_ID and publish the iOS and Android domain association files for that domain.',
    ./codex-session-01a1226f-72a5-7360-a0b6-5c3f1e0342.md:8395:    artifacts/ausd-wallet/services/passkey.ts:218:      'Passkey setup needs a verified HTTPS domain. Configure EXPO_PUBLIC_RP_ID and publish the iOS and Android domain association files for that domain.',
    ./codex-session-01a1226f-72a5-7360-a0b6-5c3f1e0342.md:9461:      const rpId = domainHost(process.env.EXPO_PUBLIC_RP_ID || process.env.EXPO_PUBLIC_DOMAIN);
    ./codex-session-01a1226f-72a5-7360-a0b6-5c3f1e0342.md:9463:      const androidPackage = process.env.AUSD_ANDROID_PACKAGE || 'com.ausd.wallet';
    ./codex-session-01a1226f-72a5-7360-a0b6-5c3f1e0342.md:9524:- `EXPO_PUBLIC_RP_ID` is not present in [.env.example](/home/runner/workspace/artifacts/ausd-wallet/.env.example).
    ./codex-session-01a1226f-72a5-7360-a0b6-5c3f1e0342.md:9681:    +      'Account recovery needs the same verified HTTPS domain used when the passkey was created. Configure EXPO_PUBLIC_RP_ID and publish the native association files for that domain.',
    ./codex-session-01a1226f-72a5-7360-a0b6-5c3f1e0342.md:9749:EXPO_PUBLIC_RP_ID=auth.yourdomain.com
    ./codex-session-01a1226f-72a5-7360-a0b6-5c3f1e0342.md:10174:EXPO_PUBLIC_RP_ID=auth.yourdomain.com
    ./codex-session-01a1226f-72a5-7360-a0b6-5c3f1e0342.md:10222:EXPO_PUBLIC_RP_ID=auth.ausd.app
    ./artifacts/ausd-wallet/README.md:9:Set `EXPO_PUBLIC_RP_ID` to the hostname that will own the passkey. It must be a verified HTTPS domain and match the app’s native domain associations. If omitted, the Expo development domain is used when available. Native builds also accept:
    ./artifacts/ausd-wallet/README.md:13:- `AUSD_ANDROID_PACKAGE` (defaults to `com.ausd.wallet`)
    ./artifacts/ausd-wallet/README.md:14:- `AUSD_ANDROID_SHA256_CERT_FINGERPRINTS`, comma-separated, for Android `assetlinks.json`
    ./artifacts/ausd-wallet/README.md:36:Configure a Codemagic variable group named `ausd_wallet`. Add `EXPO_PUBLIC_ALCHEMY_MONAD_RPC_URL` for Alchemy-backed testnet reads. For passkey use in the installed app, also configure `EXPO_PUBLIC_RP_ID` and the Android package/signing-certificate association values used by the app's `/.well-known/assetlinks.json` endpoint. Download the APK from the Codemagic build artifacts. The existing workflow triggers on pushes to `main`; use Codemagic's manual start action to build another branch.
    ./artifacts/ausd-wallet/README.md:42:To produce an APK configured for the live testnet demo, add repository **Actions secrets** in **Settings → Secrets and variables → Actions**: `EXPO_PUBLIC_RP_ID` and `EXPO_PUBLIC_PIMLICO_BUNDLER_URL` are required by the build workflow. `EXPO_PUBLIC_ALCHEMY_MONAD_RPC_URL` is optional; without it the app uses Monad public testnet RPC. Add `EXPO_PUBLIC_PIMLICO_POLICY_ID` if the Pimlico URL does not select the sponsorship policy. The `EXPO_PUBLIC_*` values are compiled into the APK; use restricted testnet credentials. `AUSD_ANDROID_PACKAGE` can be set as a repository Actions variable; it defaults to `com.ausd.wallet`. Passkey authentication also requires the matching Android asset links file to be published for the RP domain and signing certificate.
    ./artifacts/ausd-wallet/README.md:55:1. Set `EXPO_PUBLIC_RP_ID` to the public HTTPS hostname configured for passkeys, and publish the Android asset links file with the package name and signing certificate SHA-256 fingerprint.
    ./artifacts/ausd-wallet/app.config.ts:13:  const rpId = domainHost(process.env.EXPO_PUBLIC_RP_ID || process.env.EXPO_PUBLIC_DOMAIN);
    ./artifacts/ausd-wallet/app.config.ts:15:  const androidPackage = process.env.AUSD_ANDROID_PACKAGE || 'com.ausd.wallet';
    ./artifacts/ausd-wallet/services/passkey.ts:151:  const configured = process.env.EXPO_PUBLIC_RP_ID || process.env.EXPO_PUBLIC_DOMAIN;
    ./artifacts/ausd-wallet/services/passkey.ts:226:      'Passkey setup needs a verified HTTPS domain. Configure EXPO_PUBLIC_RP_ID and publish the iOS and Android domain association files for that domain.',
    ./artifacts/ausd-wallet/services/passkey.ts:266:      'Account recovery needs the same verified HTTPS domain used when the passkey was created. Configure EXPO_PUBLIC_RP_ID and publish the native association files for that domain.',
    ./artifacts/ausd-wallet/server/serve.js:102:    const packageName = process.env.AUSD_ANDROID_PACKAGE || 'com.ausd.wallet';
    ./artifacts/ausd-wallet/server/serve.js:103:    const fingerprints = (process.env.AUSD_ANDROID_SHA256_CERT_FINGERPRINTS || '')
    ./artifacts/ausd-wallet/server/serve.js:109:      res.end(JSON.stringify({ error: 'Set AUSD_ANDROID_SHA256_CERT_FINGERPRINTS to publish Android passkey associations.' }));
    ./codemagic.yaml:10:        AUSD_ANDROID_PACKAGE: com.ausd.wallet
    ./codex-session-01a11fa2-3c6c-7f40-8c72-bf86d6ac76f.md:1392:    artifacts/ausd-wallet/README.md:13:- `AUSD_ANDROID_PACKAGE` (defaults to `com.ausd.wallet`)
    ./codex-session-01a11fa2-3c6c-7f40-8c72-bf86d6ac76f.md:1393:    artifacts/ausd-wallet/README.md:14:- `AUSD_ANDROID_SHA256_CERT_FINGERPRINTS`, comma-separated, for Android `assetlinks.json`
    ./codex-session-01a11fa2-3c6c-7f40-8c72-bf86d6ac76f.md:1397:    artifacts/ausd-wallet/README.md:34:Configure a Codemagic variable group named `ausd_wallet`. Add `EXPO_PUBLIC_ALCHEMY_MONAD_RPC_URL` for Alchemy-backed testnet reads. For passkey use in the installed app, also configure `EXPO_PUBLIC_RP_ID` and the Android package/signing-certificate association values used by the app's `/.well-known/assetlinks.json` endpoint. Download the APK from the Codemagic build artifacts. The existing workflow triggers on pushes to `main`; use Codemagic's manual start action to build another branch.
    ./codex-session-01a11fa2-3c6c-7f40-8c72-bf86d6ac76f.md:1398:    artifacts/ausd-wallet/README.md:40:To produce an APK configured for the live testnet demo, add repository **Actions secrets** in **Settings → Secrets and variables → Actions**: `EXPO_PUBLIC_RP_ID` and `EXPO_PUBLIC_PIMLICO_BUNDLER_URL` are required by the build workflow. `EXPO_PUBLIC_ALCHEMY_MONAD_RPC_URL` is optional; without it the app uses Monad public testnet RPC. Add `EXPO_PUBLIC_PIMLICO_POLICY_ID` if the Pimlico URL does not select the sponsorship policy. The `EXPO_PUBLIC_*` values are compiled into the APK; use restricted testnet credentials. `AUSD_ANDROID_PACKAGE` can be set as a repository Actions variable; it defaults to `com.ausd.wallet`. Passkey authentication also requires the matching Android asset links file to be published for the RP domain and signing certificate.
    ./codex-session-01a11fa2-3c6c-7f40-8c72-bf86d6ac76f.md:5937:          'Passkey setup needs a verified HTTPS domain. Configure EXPO_PUBLIC_RP_ID and publish the iOS and Android domain association files for that domain.',
    ./codex-session-01a11fa2-3c6c-7f40-8c72-bf86d6ac76f.md:6285:          'Passkey setup needs a verified HTTPS domain. Configure EXPO_PUBLIC_RP_ID and publish the iOS and Android domain association files for that domain.',
    ./codex-session-01a11fa2-3c6c-7f40-8c72-bf86d6ac76f.md:6454:       217          'Passkey setup needs a verified HTTPS domain. Configure EXPO_PUBLIC_RP_ID and publish the iOS and Android domain association files for that domain.',
    ./codex-session-01a11fa2-3c6c-7f40-8c72-bf86d6ac7c6f.md:1392:    artifacts/ausd-wallet/README.md:13:- `AUSD_ANDROID_PACKAGE` (defaults to `com.ausd.wallet`)
    ./codex-session-01a11fa2-3c6c-7f40-8c72-bf86d6ac7c6f.md:1393:    artifacts/ausd-wallet/README.md:14:- `AUSD_ANDROID_SHA256_CERT_FINGERPRINTS`, comma-separated, for Android `assetlinks.json`
    ./codex-session-01a11fa2-3c6c-7f40-8c72-bf86d6ac7c6f.md:1397:    artifacts/ausd-wallet/README.md:34:Configure a Codemagic variable group named `ausd_wallet`. Add `EXPO_PUBLIC_ALCHEMY_MONAD_RPC_URL` for Alchemy-backed testnet reads. For passkey use in the installed app, also configure `EXPO_PUBLIC_RP_ID` and the Android package/signing-certificate association values used by the app's `/.well-known/assetlinks.json` endpoint. Download the APK from the Codemagic build artifacts. The existing workflow triggers on pushes to `main`; use Codemagic's manual start action to build another branch.
    ./codex-session-01a11fa2-3c6c-7f40-8c72-bf86d6ac7c6f.md:1398:    artifacts/ausd-wallet/README.md:40:To produce an APK configured for the live testnet demo, add repository **Actions secrets** in **Settings → Secrets and variables → Actions**: `EXPO_PUBLIC_RP_ID` and `EXPO_PUBLIC_PIMLICO_BUNDLER_URL` are required by the build workflow. `EXPO_PUBLIC_ALCHEMY_MONAD_RPC_URL` is optional; without it the app uses Monad public testnet RPC. Add `EXPO_PUBLIC_PIMLICO_POLICY_ID` if the Pimlico URL does not select the sponsorship policy. The `EXPO_PUBLIC_*` values are compiled into the APK; use restricted testnet credentials. `AUSD_ANDROID_PACKAGE` can be set as a repository Actions variable; it defaults to `com.ausd.wallet`. Passkey authentication also requires the matching Android asset links file to be published for the RP domain and signing certificate.
    ./coder.md:1392:    artifacts/ausd-wallet/README.md:13:- `AUSD_ANDROID_PACKAGE` (defaults to `com.ausd.wallet`)
    ./coder.md:1393:    artifacts/ausd-wallet/README.md:14:- `AUSD_ANDROID_SHA256_CERT_FINGERPRINTS`, comma-separated, for Android `assetlinks.json`
    ./coder.md:1397:    artifacts/ausd-wallet/README.md:34:Configure a Codemagic variable group named `ausd_wallet`. Add `EXPO_PUBLIC_ALCHEMY_MONAD_RPC_URL` for Alchemy-backed testnet reads. For passkey use in the installed app, also configure `EXPO_PUBLIC_RP_ID` and the Android package/signing-certificate association values used by the app's `/.well-known/assetlinks.json` endpoint. Download the APK from the Codemagic build artifacts. The existing workflow triggers on pushes to `main`; use Codemagic's manual start action to build another branch.
    ./coder.md:1398:    artifacts/ausd-wallet/README.md:40:To produce an APK configured for the live testnet demo, add repository **Actions secrets** in **Settings → Secrets and variables → Actions**: `EXPO_PUBLIC_RP_ID` and `EXPO_PUBLIC_PIMLICO_BUNDLER_URL` are required by the build workflow. `EXPO_PUBLIC_ALCHEMY_MONAD_RPC_URL` is optional; without it the app uses Monad public testnet RPC. Add `EXPO_PUBLIC_PIMLICO_POLICY_ID` if the Pimlico URL does not select the sponsorship policy. The `EXPO_PUBLIC_*` values are compiled into the APK; use restricted testnet credentials. `AUSD_ANDROID_PACKAGE` can be set as a repository Actions variable; it defaults to `com.ausd.wallet`. Passkey authentication also requires the matching Android asset links file to be published for the RP domain and signing certificate.
    ✓ • 29ms

## Activity

    $ rg -n -i "reactNativeWebAuthnClient|PASSKEY_OPERATION_FAILED|createPasskeyWithPrfOutput|rpId" node_modules/@category-labs/mera artifacts/ausd-wallet/node_modules/@category-labs/mera 2>/dev/null | head -300 && sed -n '1,120p' codemagic.yaml && sed -n '1,120p' .github/workflows/build-android-apk.yml
    artifacts/ausd-wallet/node_modules/@category-labs/mera/src/webauthn.ts:63:    rpId: string;
    artifacts/ausd-wallet/node_modules/@category-labs/mera/src/webauthn.ts:67:     * credential for `rpId` may answer.
    artifacts/ausd-wallet/node_modules/@category-labs/mera/src/webauthn.ts:154:        rpId: request.rpId,
    artifacts/ausd-wallet/node_modules/@category-labs/mera/src/webauthn.ts:209:      "PASSKEY_OPERATION_FAILED",
    artifacts/ausd-wallet/node_modules/@category-labs/mera/src/react-native-webauthn-client-internal.ts:25:function createReactNativeWebAuthnClient(
    artifacts/ausd-wallet/node_modules/@category-labs/mera/src/react-native-webauthn-client-internal.ts:62:          "PASSKEY_OPERATION_FAILED",
    artifacts/ausd-wallet/node_modules/@category-labs/mera/src/react-native-webauthn-client-internal.ts:73:        rpId: request.rpId,
    artifacts/ausd-wallet/node_modules/@category-labs/mera/src/react-native-webauthn-client-internal.ts:105:          "PASSKEY_OPERATION_FAILED",
    artifacts/ausd-wallet/node_modules/@category-labs/mera/src/react-native-webauthn-client-internal.ts:146:export { createReactNativeWebAuthnClient };
    artifacts/ausd-wallet/node_modules/@category-labs/mera/src/errors.ts:4: * - `PASSKEY_OPERATION_FAILED`: WebAuthn failed, was cancelled, returned an unexpected credential, or the credential API is unavailable.
    artifacts/ausd-wallet/node_modules/@category-labs/mera/src/errors.ts:13:  | "PASSKEY_OPERATION_FAILED"
    artifacts/ausd-wallet/node_modules/@category-labs/mera/src/index.ts:6:export { createPasskeyWithPrfOutput, getPasskeyPrfOutput } from "./passkey.js";
    artifacts/ausd-wallet/node_modules/@category-labs/mera/src/react-native-webauthn-client.ts:8:import { createReactNativeWebAuthnClient } from "./react-native-webauthn-client-internal.js";
    artifacts/ausd-wallet/node_modules/@category-labs/mera/src/react-native-webauthn-client.ts:11:const reactNativeWebAuthnClient: WebAuthnClient =
    artifacts/ausd-wallet/node_modules/@category-labs/mera/src/react-native-webauthn-client.ts:12:  createReactNativeWebAuthnClient(platformApi);
    artifacts/ausd-wallet/node_modules/@category-labs/mera/src/react-native-webauthn-client.ts:14:export { reactNativeWebAuthnClient };
    artifacts/ausd-wallet/node_modules/@category-labs/mera/src/passkey.ts:42: * @throws MeraError with code `PASSKEY_OPERATION_FAILED` when WebAuthn is unavailable, cancelled, or returns an unexpected credential.
    artifacts/ausd-wallet/node_modules/@category-labs/mera/src/passkey.ts:44:async function createPasskeyWithPrfOutput({
    artifacts/ausd-wallet/node_modules/@category-labs/mera/src/passkey.ts:50:}: createPasskeyWithPrfOutput.Options): Promise<createPasskeyWithPrfOutput.Result> {
    artifacts/ausd-wallet/node_modules/@category-labs/mera/src/passkey.ts:89:              rpId: rp.id,
    artifacts/ausd-wallet/node_modules/@category-labs/mera/src/passkey.ts:107:    throw new MeraError("PASSKEY_OPERATION_FAILED", "Passkey creation failed", {
    artifacts/ausd-wallet/node_modules/@category-labs/mera/src/passkey.ts:113:declare namespace createPasskeyWithPrfOutput {
    artifacts/ausd-wallet/node_modules/@category-labs/mera/src/passkey.ts:165: * credential, `rpId`, and salt; a different salt yields an unrelated output.
    artifacts/ausd-wallet/node_modules/@category-labs/mera/src/passkey.ts:180: * @throws MeraError with code `PASSKEY_OPERATION_FAILED` when WebAuthn is unavailable, cancelled, or returns an unexpected credential.
    artifacts/ausd-wallet/node_modules/@category-labs/mera/src/passkey.ts:183:  rpId,
    artifacts/ausd-wallet/node_modules/@category-labs/mera/src/passkey.ts:193:      rpId,
    artifacts/ausd-wallet/node_modules/@category-labs/mera/src/passkey.ts:221:      "PASSKEY_OPERATION_FAILED",
    artifacts/ausd-wallet/node_modules/@category-labs/mera/src/passkey.ts:232:    rpId: string;
    artifacts/ausd-wallet/node_modules/@category-labs/mera/src/passkey.ts:308:  createPasskeyWithPrfOutput,
    artifacts/ausd-wallet/node_modules/@category-labs/mera/src/secret.ts:4:  createPasskeyWithPrfOutput,
    artifacts/ausd-wallet/node_modules/@category-labs/mera/src/secret.ts:88:  credential: createPasskeyWithPrfOutput.Result;
    artifacts/ausd-wallet/node_modules/@category-labs/mera/src/secret.ts:142:  createPasskeyWithPrfOutput.Options,
    artifacts/ausd-wallet/node_modules/@category-labs/mera/src/secret.ts:189: * @throws MeraError with code `PASSKEY_OPERATION_FAILED` when WebAuthn is unavailable, cancelled, or returns an unexpected credential.
    artifacts/ausd-wallet/node_modules/@category-labs/mera/src/secret.ts:199:    const credential = await createPasskeyWithPrfOutput({
    artifacts/ausd-wallet/node_modules/@category-labs/mera/src/secret.ts:225: * @throws MeraError with code `PASSKEY_OPERATION_FAILED` when WebAuthn is unavailable, cancelled, or returns an unexpected credential.
    artifacts/ausd-wallet/node_modules/@category-labs/mera/src/secret.ts:404: * @throws MeraError with code `PASSKEY_OPERATION_FAILED` when WebAuthn is unavailable, cancelled, or returns an unexpected credential.
    workflows:
      ausd-wallet-android:
        name: AUSD Wallet Android APK
        max_build_duration: 120
        instance_type: mac_mini_m2
        environment:
          groups:
            - ausd_wallet
          vars:
            AUSD_ANDROID_PACKAGE: com.ausd.wallet
            COREPACK_ENABLE_PROJECT_SPEC: "0"
        triggering:
          events:
            - push
          branch_patterns:
            - pattern: main
              include: true
              source: true
        scripts:
          - name: Set up pnpm
            script: |
              corepack enable
              corepack prepare pnpm@10.26.1 --activate
          - name: Install workspace dependencies
            script: |
              cd "$CM_BUILD_DIR"
              pnpm install --frozen-lockfile
          - name: Generate Android project with Expo
            script: |
              cd "$CM_BUILD_DIR/artifacts/ausd-wallet"
              pnpm exec expo prebuild --platform android --no-install --non-interactive
          - name: Set Android SDK location
            script: |
              echo "sdk.dir=$ANDROID_SDK_ROOT" > "$CM_BUILD_DIR/artifacts/ausd-wallet/android/local.properties"
          - name: Build bundled release APK
            script: |
              cd "$CM_BUILD_DIR/artifacts/ausd-wallet/android"
              ./gradlew assembleRelease
        artifacts:
          - artifacts/ausd-wallet/android/app/build/outputs/apk/release/*.apk
    name: Build Android APK
    
    on:
      push:
      workflow_dispatch:
    
    permissions:
      contents: read
    
    concurrency:
      group: android-apk-${{ github.ref }}
      cancel-in-progress: true
    
    jobs:
      build:
        name: Build AUSD Wallet app APK
        runs-on: ubuntu-latest
        timeout-minutes: 45
        env:
          AUSD_ANDROID_PACKAGE: ${{ vars.AUSD_ANDROID_PACKAGE || 'com.ausd.wallet' }}
          EXPO_PUBLIC_RP_ID: ${{ secrets.EXPO_PUBLIC_RP_ID }}
          EXPO_PUBLIC_ALCHEMY_MONAD_RPC_URL: ${{ secrets.EXPO_PUBLIC_ALCHEMY_MONAD_RPC_URL }}
          EXPO_PUBLIC_PIMLICO_BUNDLER_URL: ${{ secrets.EXPO_PUBLIC_PIMLICO_BUNDLER_URL }}
          EXPO_PUBLIC_PIMLICO_POLICY_ID: ${{ secrets.EXPO_PUBLIC_PIMLICO_POLICY_ID }}
          EXPO_PUBLIC_ENVIO_GRAPHQL_URL: ${{ vars.EXPO_PUBLIC_ENVIO_GRAPHQL_URL }}
          EXPO_PUBLIC_AURORA_INTENTS_API_KEY: ${{ vars.EXPO_PUBLIC_AURORA_INTENTS_API_KEY }}
    
        steps:
          - name: Check out repository
            uses: actions/checkout@v4
    
          - name: Set up pnpm
            uses: pnpm/action-setup@v4
            with:
              version: 10.26.1
    
          - name: Set up Node.js
            uses: actions/setup-node@v4
            with:
              node-version: 22
              cache: pnpm
    
          - name: Set up Java
            uses: actions/setup-java@v4
            with:
              distribution: temurin
              java-version: '17'
    
          - name: Set up Android SDK
            uses: android-actions/setup-android@v3
            with:
              packages: platform-tools
    
          - name: Install workspace dependencies
            run: pnpm install --frozen-lockfile
    
          - name: Validate wallet build settings
            working-directory: artifacts/ausd-wallet
            shell: bash
            run: |
              missing=()
              for name in EXPO_PUBLIC_RP_ID EXPO_PUBLIC_PIMLICO_BUNDLER_URL; do
                if [[ -z "${!name}" ]]; then
                  missing+=("$name")
                fi
              done
    
              if (( ${#missing[@]} > 0 )); then
                printf '::error::Missing required GitHub Actions secrets: %s\n' "${missing[*]}"
                echo 'Add them under Settings > Secrets and variables > Actions > Repository secrets, then rerun this workflow.'
                exit 1
              fi
    
              rp_host="$(node -e "console.log(new URL(process.env.EXPO_PUBLIC_RP_ID.includes('://') ? process.env.EXPO_PUBLIC_RP_ID : 'https://' + process.env.EXPO_PUBLIC_RP_ID).hostname)")"
              if [[ "$rp_host" != "auth.vic-ezealor.workers.dev" ]]; then
                echo "::error::EXPO_PUBLIC_RP_ID must be auth.vic-ezealor.workers.dev for the published Android association file; received $rp_host"
                exit 1
              fi
              assetlinks="$(curl --fail --silent --show-error --location --max-redirs 0 "https://$rp_host/.well-known/assetlinks.json")"
              if ! printf '%s' "$assetlinks" | node -e "let s=''; process.stdin.on('data', c => s += c).on('end', () => { const entries = JSON.parse(s); const ok = entries.some(e => e.target?.namespace === 'android_app' && e.target?.package_name === (process.env.AUSD_ANDROID_PACKAGE || 'com.ausd.wallet') && e.relation?.includes('delegate_permission/common.get_login_creds') && e.target.sha256_cert_fingerprints?.length); if (!ok) process.exit(1); })"; then
                echo '::error::The RP domain assetlinks.json does not contain the Android package, get_login_creds relation, and certificate fingerprint.'
                exit 1
              fi
    
              if [[ -z "$EXPO_PUBLIC_ALCHEMY_MONAD_RPC_URL" ]]; then
                echo '::notice::EXPO_PUBLIC_ALCHEMY_MONAD_RPC_URL is unset; the app will use Monad public testnet RPC.'
              fi
              if [[ -z "$EXPO_PUBLIC_PIMLICO_POLICY_ID" ]]; then
                echo '::notice::EXPO_PUBLIC_PIMLICO_POLICY_ID is unset; the bundler URL must select the sponsorship policy.'
              fi
              if [[ -z "$EXPO_PUBLIC_ENVIO_GRAPHQL_URL" ]]; then
                echo '::notice::EXPO_PUBLIC_ENVIO_GRAPHQL_URL is unset; activity will use device-saved transfer history.'
              fi
              if [[ -z "$EXPO_PUBLIC_AURORA_INTENTS_API_KEY" ]]; then
                echo '::notice::EXPO_PUBLIC_AURORA_INTENTS_API_KEY is unset; Aurora Intents deposits will be unavailable.'
              fi
    
          - name: Generate Android project
            working-directory: artifacts/ausd-wallet
            run: pnpm exec expo prebuild --platform android --no-install --non-interactive
    
          - name: Build bundled release APK
            working-directory: artifacts/ausd-wallet/android
            run: ./gradlew --no-daemon assembleRelease
    
          - name: Print Android passkey certificate fingerprint
            working-directory: artifacts/ausd-wallet/android
            run: |
              keytool -list -v \
                -keystore app/debug.keystore \
                -alias androiddebugkey \
                -storepass android \
                -keypass android | grep -E "Alias name|SHA256:"
    
          - name: Upload APK artifact
            uses: actions/upload-artifact@v4
            with:
              name: ausd-wallet-android-${{ github.sha }}
              path: artifacts/ausd-wallet/android/app/build/outputs/apk/release/*.apk
              if-no-files-found: error
    ✓ • 22ms

## Activity

    $ sed -n '1,180p' artifacts/ausd-wallet/node_modules/@category-labs/mera/src/react-native-webauthn-client-internal.ts && sed -n '1,135p' artifacts/ausd-wallet/node_modules/@category-labs/mera/src/passkey.ts && find artifacts/ausd-wallet -maxdepth 3 -type f \( -name '.env*' -o -name 'AndroidManifest.xml' -o -name 'gradle.properties' \) -print
    import type { Passkey } from "react-native-passkey";
    import {
      base64UrlDecode,
      base64UrlEncode,
      normalizeByteArray,
    } from "./encoding.js";
    import type { MeraErrorCode } from "./errors.js";
    import type { WebAuthnClient } from "./webauthn.js";
    
    type PlatformApi = Pick<typeof Passkey, "createPlatformKey" | "getPlatformKey">;
    
    type NativeGetRequest = Parameters<PlatformApi["getPlatformKey"]>[0];
    type NativeGetResult = Awaited<ReturnType<PlatformApi["getPlatformKey"]>>;
    type NativeExtensions = NonNullable<NativeGetRequest["extensions"]>;
    
    type NativeTransport = NonNullable<
      NonNullable<NativeGetRequest["allowCredentials"]>[number]["transports"]
    >[number];
    type NativePrfValue = NonNullable<
      NonNullable<
        NonNullable<NativeGetResult["clientExtensionResults"]>["prf"]
      >["results"]
    >["first"];
    
    function createReactNativeWebAuthnClient(
      platformApi: PlatformApi,
    ): WebAuthnClient {
      return {
        async createCredential(request) {
          // The general iOS entry point can offer a security key, whose result has
          // no PRF output. Android treats the platform-only flag as a no-op.
          const created = await platformApi.createPlatformKey({
            rp: request.rp,
            user: {
              id: base64UrlEncode(request.user.id),
              name: request.user.name,
              displayName: request.user.displayName,
            },
            challenge: base64UrlEncode(request.challenge),
            pubKeyCredParams: request.algorithms.map((alg) => ({
              type: "public-key",
              alg,
            })),
            authenticatorSelection: {
              residentKey: request.residentKey,
              requireResidentKey: true,
              userVerification: request.userVerification,
            },
            attestation: request.attestation,
            extensions: prfExtension(request.prfSalt),
            ...(request.timeout !== undefined ? { timeout: request.timeout } : {}),
          });
    
          const prf = created.clientExtensionResults?.prf;
          const prfOutput = readPrfOutput(prf?.results?.first);
          const transports = created.response.transports;
    
          return {
            credentialId: decodeNativeBase64Url(
              created.rawId,
              "Credential ID",
              "PASSKEY_OPERATION_FAILED",
            ),
            ...(transports !== undefined ? { transports } : {}),
            prfEnabled: prf?.enabled === true,
            ...(prfOutput !== undefined ? { prfOutput } : {}),
          };
        },
    
        async getCredential(request) {
          const { allowCredential } = request;
          const asserted = await platformApi.getPlatformKey({
            rpId: request.rpId,
            challenge: base64UrlEncode(request.challenge),
            userVerification: request.userVerification,
            extensions: prfExtension(request.prfSalt),
            ...(allowCredential !== undefined
              ? {
                  allowCredentials: [
                    {
                      type: "public-key" as const,
                      id: base64UrlEncode(allowCredential.credentialId),
                      ...(allowCredential.transports !== undefined
                        ? {
                            transports: [
                              ...allowCredential.transports,
                            ] as NativeTransport[],
                          }
                        : {}),
                    },
                  ],
                }
              : {}),
            ...(request.timeout !== undefined ? { timeout: request.timeout } : {}),
          });
    
          const prfOutput = readPrfOutput(
            asserted.clientExtensionResults?.prf?.results?.first,
          );
    
          return {
            credentialId: decodeNativeBase64Url(
              asserted.rawId ?? asserted.id,
              "Credential ID",
              "PASSKEY_OPERATION_FAILED",
            ),
            ...(prfOutput !== undefined ? { prfOutput } : {}),
          };
        },
      };
    }
    
    /**
     * react-native-passkey rewrites binary request fields on Android. On iOS, the
     * PRF salt reaches Swift as the index-keyed object produced by stringifying a
     * Uint8Array. Keeping the salt as bytes is the one shape both platforms read.
     */
    function prfExtension(prfSalt: Uint8Array): NativeExtensions {
      return { prf: { eval: { first: prfSalt } } };
    }
    
    function decodeNativeBase64Url(
      value: string,
      name: string,
      code: MeraErrorCode,
    ): Uint8Array {
      return base64UrlDecode(
        value.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
        { name, code },
      );
    }
    
    function readPrfOutput(
      value: NativePrfValue | undefined,
    ): Uint8Array | undefined {
      if (value === undefined) return undefined;
      if (typeof value === "string") {
        return decodeNativeBase64Url(value, "PRF output", "PRF_UNAVAILABLE");
      }
      return normalizeByteArray(value, {
        name: "PRF output",
        code: "PRF_UNAVAILABLE",
      });
    }
    
    export { createReactNativeWebAuthnClient };
    import { sha256 } from "@noble/hashes/sha2.js";
    import { utf8ToBytes } from "@noble/hashes/utils.js";
    import { base64UrlDecode, base64UrlEncode, copyBytes } from "./encoding.js";
    import { isMeraError, MeraError } from "./errors.js";
    import type {
      PasskeyCredentialMetadata,
      PasskeyCredentialTransport,
      PasskeyRelyingParty,
    } from "./types.js";
    import { browserWebAuthnClient, type WebAuthnClient } from "./webauthn.js";
    import { randomBytes } from "./webcrypto.js";
    
    const DEFAULT_PRF_SALT = sha256(utf8ToBytes("mera.prf.salt.v1"));
    
    const PASSKEY_COSE_ALGORITHMS = [-7, -257];
    
    /**
     * Creates a discoverable, user-verified passkey that requires WebAuthn PRF
     * support and returns the first PRF output.
     *
     * @param options - Passkey creation inputs.
     * @returns Credential metadata and the first PRF output.
     * @remarks
     * Runs one creation ceremony and shows one user-verification prompt. On
     * authenticators that do not evaluate PRF during creation, a fallback
     * assertion evaluates the same salt and shows a second prompt.
     *
     * WebAuthn challenges and the credential's user handle (`user.id`) are
     * generated internally, 32 random bytes each. An authenticator overwrites a
     * discoverable credential that has the same `rp.id` and `user.id`, so a fresh
     * handle per call adds a passkey instead of replacing one.
     *
     * The credential is requested with fixed parameters: ES256 or RS256 key types,
     * attestation `"none"`, a required resident key, and required user
     * verification ({@link getPasskeyPrfOutput} explains the requirement).
     *
     * Any failure after the creation ceremony completes leaves the passkey on the
     * authenticator, but the thrown error does not carry its metadata.
     * @throws MeraError with code `PRF_UNAVAILABLE` when the authenticator reports no PRF support and returns no create-time output, returns an output that is not 32 bytes, or returns none on the fallback ceremony.
     * @throws MeraError with code `INPUT_INVALID` when an explicit `prfSalt` is not 32 bytes.
     * @throws MeraError with code `CRYPTO_UNAVAILABLE` when `crypto.getRandomValues` is unavailable.
     * @throws MeraError with code `PASSKEY_OPERATION_FAILED` when WebAuthn is unavailable, cancelled, or returns an unexpected credential.
     */
    async function createPasskeyWithPrfOutput({
      rp,
      user,
      timeout,
      prfSalt,
      webAuthnClient = browserWebAuthnClient,
    }: createPasskeyWithPrfOutput.Options): Promise<createPasskeyWithPrfOutput.Result> {
      try {
        validatePrfSalt(prfSalt);
    
        const prfSaltCopy = copyBytes(prfSalt ?? DEFAULT_PRF_SALT);
    
        const created = await webAuthnClient.createCredential({
          rp,
          user: {
            id: randomBytes(32),
            name: user.name,
            displayName: user.displayName,
          },
          challenge: randomBytes(32),
          algorithms: PASSKEY_COSE_ALGORITHMS,
          prfSalt: prfSaltCopy,
          residentKey: "required",
          userVerification: "required",
          attestation: "none",
          ...(timeout !== undefined ? { timeout } : {}),
        });
    
        if (created.prfOutput === undefined && !created.prfEnabled) {
          throw new MeraError(
            "PRF_UNAVAILABLE",
            "Authenticator did not enable PRF",
          );
        }
    
        const credentialMetadata = toCredentialMetadata(
          base64UrlEncode(created.credentialId),
          created.transports,
        );
    
        const prfOutput =
          created.prfOutput !== undefined
            ? copyPrfOutput(created.prfOutput)
            : (
                await getPasskeyPrfOutput({
                  rpId: rp.id,
                  credential: credentialMetadata,
                  prfSalt: prfSaltCopy,
                  webAuthnClient,
                  ...(timeout !== undefined ? { timeout } : {}),
                })
              ).prfOutput;
    
        return {
          ...credentialMetadata,
          prfSalt: prfSaltCopy,
          prfOutput,
        };
      } catch (error) {
        if (isMeraError(error)) {
          throw error;
        }
    
        throw new MeraError("PASSKEY_OPERATION_FAILED", "Passkey creation failed", {
          cause: error,
        });
      }
    }
    
    declare namespace createPasskeyWithPrfOutput {
      /** Inputs for creating a passkey and obtaining its first WebAuthn PRF output. */
      type Options = {
        /**
         * Relying party identity passed to WebAuthn. `id` is required so the
         * fallback assertion can target the same relying party.
         */
        rp: PasskeyRelyingParty;
        /** User identity passed to WebAuthn. */
        user: {
          /** User name displayed or stored by the authenticator. */
          name: string;
          /** Human-readable display name for the authenticator UI. */
          displayName: string;
        };
        /** WebAuthn timeout in milliseconds. Platform defaults apply when omitted. */
        timeout?: number;
        /**
         * 32-byte PRF salt evaluated during creation, or by the fallback assertion.
         * Defaults to the fixed salt documented on {@link getPasskeyPrfOutput}.
         */
        prfSalt?: Uint8Array;
        /**
    artifacts/ausd-wallet/android/gradle.properties
    artifacts/ausd-wallet/.env.example
    artifacts/ausd-wallet/.env.local
    ✓ • 0ms

## Activity

    $ find artifacts/ausd-wallet/android -name AndroidManifest.xml -print -exec sed -n '1,220p' {} \; && sed -n '1,160p' artifacts/ausd-wallet/node_modules/react-native-passkey/README.md && rg -n "asset_statements|assetlinks|delegate_permission|android" artifacts/ausd-wallet/node_modules/react-native-passkey --glob '!**/*.map' | head -250 && sed -n '1,120p' artifacts/ausd-wallet/.env.example && cut -d= -f1 artifacts/ausd-wallet/.env.local 2>/dev/null
    artifacts/ausd-wallet/android/app/src/main/AndroidManifest.xml
    <manifest xmlns:android="http://schemas.android.com/apk/res/android" xmlns:tools="http://schemas.android.com/tools">
      <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>
      <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
      <uses-permission android:name="android.permission.INTERNET"/>
      <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" tools:replace="android:maxSdkVersion"/>
      <uses-permission android:name="android.permission.RECORD_AUDIO"/>
      <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW"/>
      <uses-permission android:name="android.permission.VIBRATE"/>
      <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="32" tools:replace="android:maxSdkVersion"/>
      <queries>
        <intent>
          <action android:name="android.intent.action.VIEW"/>
          <category android:name="android.intent.category.BROWSABLE"/>
          <data android:scheme="https"/>
        </intent>
      </queries>
      <application android:name=".MainApplication" android:label="@string/app_name" android:icon="@mipmap/ic_launcher" android:allowBackup="true" android:theme="@style/AppTheme" android:supportsRtl="true" android:enableOnBackInvokedCallback="false" android:fullBackupContent="@xml/secure_store_backup_rules" android:dataExtractionRules="@xml/secure_store_data_extraction_rules">
        <meta-data android:name="expo.modules.updates.ENABLED" android:value="false"/>
        <meta-data android:name="expo.modules.updates.ENABLE_BSDIFF_PATCH_SUPPORT" android:value="true"/>
        <meta-data android:name="expo.modules.updates.EXPO_UPDATES_CHECK_ON_LAUNCH" android:value="ALWAYS"/>
        <meta-data android:name="expo.modules.updates.EXPO_UPDATES_LAUNCH_WAIT_MS" android:value="0"/>
        <activity android:name=".MainActivity" android:configChanges="keyboard|keyboardHidden|orientation|screenSize|screenLayout|uiMode|smallestScreenSize|assetsPaths" android:launchMode="singleTask" android:windowSoftInputMode="adjustResize" android:theme="@style/Theme.App.SplashScreen" android:exported="true" android:screenOrientation="portrait">
          <intent-filter>
            <action android:name="android.intent.action.MAIN"/>
            <category android:name="android.intent.category.LAUNCHER"/>
          </intent-filter>
          <intent-filter>
            <action android:name="android.intent.action.VIEW"/>
            <category android:name="android.intent.category.DEFAULT"/>
            <category android:name="android.intent.category.BROWSABLE"/>
            <data android:scheme="ausd-wallet"/>
            <data android:scheme="exp+ausd-wallet"/>
          </intent-filter>
        </activity>
      </application>
    </manifest>artifacts/ausd-wallet/android/app/src/debug/AndroidManifest.xml
    <manifest xmlns:android="http://schemas.android.com/apk/res/android"
        xmlns:tools="http://schemas.android.com/tools">
    
        <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW"/>
    
        <application android:usesCleartextTraffic="true" tools:targetApi="28" tools:ignore="GoogleAppIndexingWarning" tools:replace="android:usesCleartextTraffic" />
    </manifest>
    artifacts/ausd-wallet/android/app/src/debugOptimized/AndroidManifest.xml
    <manifest xmlns:android="http://schemas.android.com/apk/res/android"
        xmlns:tools="http://schemas.android.com/tools">
    
        <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW"/>
    
        <application android:usesCleartextTraffic="true" tools:targetApi="28" tools:ignore="GoogleAppIndexingWarning" tools:replace="android:usesCleartextTraffic" />
    </manifest>
    # react-native-passkey
    
    [![Build](https://img.shields.io/github/actions/workflow/status/mTRx0/react-native-passkey/main.yml?branch=stable)](https://img.shields.io/github/workflow/status/mTRx0/react-native-passkey/Build) [![Version](https://img.shields.io/npm/v/react-native-passkey)](https://img.shields.io/npm/v/react-native-passkey) [![License](https://img.shields.io/npm/l/react-native-passkey)](https://img.shields.io/npm/l/react-native-passkey)
    
    Native Passkeys on iOS 15.0+ and Android API 28+ using React Native.
    
    > You can find an example backend for testing [here](https://github.com/f-23/passkey-server-example).
    
    ## Installation
    
    #### Javascript
    
    For the javascript part of the installation you need to run
    
    ```sh
    npm install react-native-passkey
    ```
    
    or
    
    ```sh
    yarn add react-native-passkey
    ```
    
    #### Native
    
    For the native part of the installation you need to run
    
    ```sh
    cd ios && pod install
    ```
    
    in the root of your React Native project.
    
    ---
    
    ## Configuration
    
    ### iOS
    
    There are iOS specific steps you need to go through in order to configure Passkey support. If you have already set up an associated domain for your application you can skip this step.
    
    #### Set up an associated domain for your application ([More info](https://developer.apple.com/documentation/xcode/supporting-associated-domains))
    
    - You need to associate a domain with your application. On your webserver set up this route:
    
      ```
      GET https://<yourdomain>/.well-known/apple-app-site-association
      ```
    
    - This route should serve a static JSON object containing your team id and bundle identifier.
      Example (replace XXXXXXXXXX with your team identifier and the rest with your bundle id, e.g. "H123456789.com.mtrx0.passkeyExample"):
    
      ```json
      {
        "applinks": {},
        "webcredentials": {
          "apps": ["XXXXXXXXXX.YYY.YYYYY.YYYYYYYYYYYYYY"]
        },
        "appclips": {}
      }
      ```
    
    - In XCode under `Signing & Capabilities` add a new Capability of type `Associated Domains`.
      Now add this and replace XXXXXX with your domain (e.g. `apple.com`)
      ```
      webcredentials:XXXXXX
      ```
    
    ### Android
    
    The Android specific configuration is similar to iOS. If you have already set up Digital Asset Links for your application you can skip this step.
    
    #### Associate your app with a domain ([More info](https://developer.android.com/training/sign-in/passkeys#add-support-dal))
    
    - You need to associate a domain with your application. On your webserver set up this route:
    
      ```
      GET https://<yourdomain>/.well-known/assetlinks.json
      ```
    
    - This route should serve a static JSON object containing the following information.
      Example (replace with your data, replace SHA_HEX_VALUE with the SHA256 fingerprints of your Android signing certificate)
    
      ```json
      [{
        "relation": ["delegate_permission/common.get_login_creds"],
        "target": {
          "namespace": "android_app",
          "package_name": "com.example",
          "sha256_cert_fingerprints": [
            SHA_HEX_VALUE
          ]
        }
      }]
      ```
    
    > If you are having issues with your backend setup you can look at an example [here](https://github.com/f-23/passkey-server-example).
    
    ---
    
    ## Usage
    
    #### Check if Passkeys are supported
    
    ```ts
    import { Passkey } from 'react-native-passkey';
    
    // Use this method to check if passkeys are supported on the device
    
    const isSupported: boolean = Passkey.isSupported();
    ```
    
    #### Creating a new Passkey
    
    ```ts
    import { Passkey, PasskeyCreateResult } from 'react-native-passkey';
    
    // Retrieve a valid FIDO2 attestation request from your server
    // The challenge inside the request needs to be a base64URL encoded string
    // There are plenty of libraries which can be used for this (e.g. fido2-lib)
    
    try {
      // Call the `create` method with the retrieved request in JSON format
      // A native overlay will be displayed
      const result: PasskeyCreateResult = await Passkey.create(requestJson);
    
      // The `create` method returns a FIDO2 attestation result
      // Pass it to your server for verification
    } catch (error) {
      // Handle Error...
    }
    ```
    
    #### Authenticating with existing Passkey
    
    ```ts
    import { Passkey, PasskeyGetResult } from 'react-native-passkey';
    
    // Retrieve a valid FIDO2 assertion request from your server
    // The challenge inside the request needs to be a base64URL encoded string
    // There are plenty of libraries which can be used for this (e.g. fido2-lib)
    
    try {
      // Call the `get` method with the retrieved request in JSON format
      // A native overlay will be displayed
      const result: PasskeyGetResult = await Passkey.get(requestJson);
    
      // The `get` method returns a FIDO2 assertion result
      // Pass it to your server for verification
    } catch (error) {
      // Handle Error...
    }
    ```
    
    #### Silent / Immediate Authentication
    
    Use `Passkey.getImmediate()` to authenticate **only** when a credential is
    already available on the device, without surfacing the system modal when
    nothing matches. This is useful for opportunistic sign-in checks (e.g. on app
    artifacts/ausd-wallet/node_modules/react-native-passkey/README.md:74:#### Associate your app with a domain ([More info](https://developer.android.com/training/sign-in/passkeys#add-support-dal))
    artifacts/ausd-wallet/node_modules/react-native-passkey/README.md:79:  GET https://<yourdomain>/.well-known/assetlinks.json
    artifacts/ausd-wallet/node_modules/react-native-passkey/README.md:87:    "relation": ["delegate_permission/common.get_login_creds"],
    artifacts/ausd-wallet/node_modules/react-native-passkey/README.md:89:      "namespace": "android_app",
    artifacts/ausd-wallet/node_modules/react-native-passkey/README.md:210:  `androidx.credentials` 1.6.0+, bundled with the library)
    artifacts/ausd-wallet/node_modules/react-native-passkey/package.json:12:    "android",
    artifacts/ausd-wallet/node_modules/react-native-passkey/package.json:18:    "!android/build",
    artifacts/ausd-wallet/node_modules/react-native-passkey/package.json:19:    "!android/gradle",
    artifacts/ausd-wallet/node_modules/react-native-passkey/package.json:20:    "!android/gradlew",
    artifacts/ausd-wallet/node_modules/react-native-passkey/package.json:21:    "!android/gradlew.bat",
    artifacts/ausd-wallet/node_modules/react-native-passkey/package.json:22:    "!android/local.properties",
    artifacts/ausd-wallet/node_modules/react-native-passkey/package.json:40:    "android",
    artifacts/ausd-wallet/node_modules/react-native-passkey/lib/commonjs/PasskeyRequest.js:9:  if (platformOS !== 'android') {
    artifacts/ausd-wallet/node_modules/react-native-passkey/lib/commonjs/Passkey.js:260:    if (_reactNative.Platform.OS === 'android') {
    artifacts/ausd-wallet/node_modules/react-native-passkey/lib/module/PasskeyRequest.js:3:  if (platformOS !== 'android') {
    artifacts/ausd-wallet/node_modules/react-native-passkey/android/build.gradle:11:    classpath 'com.android.tools.build:gradle:8.13.0'
    artifacts/ausd-wallet/node_modules/react-native-passkey/android/build.gradle:21:apply plugin: 'com.android.library'
    artifacts/ausd-wallet/node_modules/react-native-passkey/android/build.gradle:27:  apply plugin: 'kotlin-android'
    artifacts/ausd-wallet/node_modules/react-native-passkey/android/build.gradle:42:android {
    artifacts/ausd-wallet/node_modules/react-native-passkey/android/build.gradle:73:  def androidSourcesName = 'React Native sources'
    artifacts/ausd-wallet/node_modules/react-native-passkey/android/build.gradle:80:      '/../../../node_modules/react-native/android'
    artifacts/ausd-wallet/node_modules/react-native-passkey/android/build.gradle:87:      name androidSourcesName
    artifacts/ausd-wallet/node_modules/react-native-passkey/android/build.gradle:99:      def androidSourcesDir = new File(
    artifacts/ausd-wallet/node_modules/react-native-passkey/android/build.gradle:104:      def androidPrebuiltBinaryDir = new File(
    artifacts/ausd-wallet/node_modules/react-native-passkey/android/build.gradle:106:        'node_modules/react-native/android'
    artifacts/ausd-wallet/node_modules/react-native-passkey/android/build.gradle:109:      if (androidPrebuiltBinaryDir.exists()) {
    artifacts/ausd-wallet/node_modules/react-native-passkey/android/build.gradle:111:          url androidPrebuiltBinaryDir.toString()
    artifacts/ausd-wallet/node_modules/react-native-passkey/android/build.gradle:112:          name androidSourcesName
    artifacts/ausd-wallet/node_modules/react-native-passkey/android/build.gradle:115:        logger.info(":${project.name}:reactNativeAndroidRoot ${androidPrebuiltBinaryDir.canonicalPath}")
    artifacts/ausd-wallet/node_modules/react-native-passkey/android/build.gradle:117:      } else if (androidSourcesDir.exists()) {
    artifacts/ausd-wallet/node_modules/react-native-passkey/android/build.gradle:119:          url androidSourcesDir.toString()
    artifacts/ausd-wallet/node_modules/react-native-passkey/android/build.gradle:120:          name androidSourcesName
    artifacts/ausd-wallet/node_modules/react-native-passkey/android/build.gradle:123:        logger.info(":${project.name}:reactNativeAndroidRoot ${androidSourcesDir.canonicalPath}")
    artifacts/ausd-wallet/node_modules/react-native-passkey/android/build.gradle:131:      "${project.name}: unable to locate React Native android sources. " +
    artifacts/ausd-wallet/node_modules/react-native-passkey/android/build.gradle:144:  implementation "androidx.credentials:credentials-play-services-auth:1.6.0"
    artifacts/ausd-wallet/node_modules/react-native-passkey/android/build.gradle:145:  implementation "androidx.credentials:credentials:1.6.0"
    artifacts/ausd-wallet/node_modules/react-native-passkey/android/build.gradle:149:  implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-android:1.10.2'
    artifacts/ausd-wallet/node_modules/react-native-passkey/lib/module/Passkey.js:254:    if (Platform.OS === 'android') {
    artifacts/ausd-wallet/node_modules/react-native-passkey/android/src/main/AndroidManifest.xml:1:<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    artifacts/ausd-wallet/node_modules/react-native-passkey/android/src/main/java/com/reactnativepasskey/PasskeyModule.kt:8:import androidx.credentials.CredentialManager
    artifacts/ausd-wallet/node_modules/react-native-passkey/android/src/main/java/com/reactnativepasskey/PasskeyModule.kt:9:import androidx.credentials.CreatePublicKeyCredentialRequest
    artifacts/ausd-wallet/node_modules/react-native-passkey/android/src/main/java/com/reactnativepasskey/PasskeyModule.kt:10:import androidx.credentials.GetCredentialRequest
    artifacts/ausd-wallet/node_modules/react-native-passkey/android/src/main/java/com/reactnativepasskey/PasskeyModule.kt:11:import androidx.credentials.GetPublicKeyCredentialOption
    artifacts/ausd-wallet/node_modules/react-native-passkey/android/src/main/java/com/reactnativepasskey/PasskeyModule.kt:12:import androidx.credentials.SignalAllAcceptedCredentialIdsRequest
    artifacts/ausd-wallet/node_modules/react-native-passkey/android/src/main/java/com/reactnativepasskey/PasskeyModule.kt:13:import androidx.credentials.SignalUnknownCredentialRequest
    artifacts/ausd-wallet/node_modules/react-native-passkey/android/src/main/java/com/reactnativepasskey/PasskeyModule.kt:14:import androidx.credentials.exceptions.*
    artifacts/ausd-wallet/node_modules/react-native-passkey/android/src/main/java/com/reactnativepasskey/PasskeyModule.kt:15:import androidx.credentials.exceptions.domerrors.*
    artifacts/ausd-wallet/node_modules/react-native-passkey/android/src/main/java/com/reactnativepasskey/PasskeyModule.kt:16:import androidx.credentials.exceptions.publickeycredential.CreatePublicKeyCredentialDomException
    artifacts/ausd-wallet/node_modules/react-native-passkey/android/src/main/java/com/reactnativepasskey/PasskeyModule.kt:17:import androidx.credentials.exceptions.publickeycredential.GetPublicKeyCredentialDomException
    artifacts/ausd-wallet/node_modules/react-native-passkey/android/src/main/java/com/reactnativepasskey/PasskeyModule.kt:46:          result.data.getString("androidx.credentials.BUNDLE_KEY_REGISTRATION_RESPONSE_JSON")
    artifacts/ausd-wallet/node_modules/react-native-passkey/android/src/main/java/com/reactnativepasskey/PasskeyModule.kt:87:        // Fall back to the androidx type constant rather than the human-readable message:
    artifacts/ausd-wallet/node_modules/react-native-passkey/android/src/main/java/com/reactnativepasskey/PasskeyModule.kt:111:            result.credential.data.getString("androidx.credentials.BUNDLE_KEY_AUTHENTICATION_RESPONSE_JSON")
    EXPO_PUBLIC_RP_ID=auth.vic-ezealor.workers.dev
    EXPO_PUBLIC_PIMLICO_BUNDLER_URL=
    # Optional if the Pimlico API key does not already select a sponsorship policy.
    EXPO_PUBLIC_PIMLICO_POLICY_ID=
    # Public Aurora Intents app key for token discovery, quotes, and deposit status.
    EXPO_PUBLIC_AURORA_INTENTS_API_KEY=
    EXPO_PUBLIC_PIMLICO_BUNDLER_URL
    
    EXPO_PUBLIC_AURORA_INITENTS_API_KEY
    ✓ • 0ms

## Assistant

The repo already reveals a likely configuration gap: its local generated Android manifest has no verified HTTPS intent filter, because the local environment does not supply `EXPO_PUBLIC_RP_ID`. I’m checking the published association and build pipeline to separate that from the Mera adapter’s behavior.

## Activity

    $ curl --fail --silent --show-error --location --max-redirs 0 -D - https://auth.vic-ezealor.workers.dev/.well-known/assetlinks.json
    HTTP/2 200
    date: Sat, 10 Oct 2026 10:38:30 GMT
    content-type: application/json
    content-length: 347
    cf-cache-status: HIT
    cache-control: public, max-age=0, must-revalidate
    etag: "71093485591295b1bfe9e2b76fbd5719"
    report-to: {"group":"cf-nel","max_age":604800,"endpoints":[{"url":"https://a.nel.cloudflare.com/report/v4?s=u4jpkpaDUbRnFqjMtoMmp1Xo3w5x0cCR7H1h90g2NADkOfFDm3yZHxPh6CpSu7stVe6iUlflaGC7%2FIgdKLj%2BPu2CXU%2Bkg5YoMsBTDFkOtBA7O4G3K2gbs2NdxtAC7rfS2%2BpHNBk96ipsJRL8n9nv"}]}
    nel: {"report_to":"cf-nel","success_fraction":0.0,"max_age":604800}
    server: cloudflare
    cf-ray: a484fef01d9b8f51-ORD
    alt-svc: h3=":443"; ma=86400
    
    [
      {
        "relation": [
          "delegate_permission/common.get_login_creds"
        ],
        "target": {
          "namespace": "android_app",
          "package_name": "com.ausd.wallet",
          "sha256_cert_fingerprints": [
            "FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C"
          ]
        }
      }
    ]
    ✓ • 20ms

## Activity

    $ find artifacts/ausd-wallet -type f \( -name '*.apk' -o -name '*.aab' -o -name '*.keystore' \) -print && rg -n "signingConfig|signingConfigs|storeFile|versionCode" artifacts/ausd-wallet/android/app/build.gradle artifacts/ausd-wallet/android/app/build.gradle.kts 2>/dev/null && sed -n '1,160p' artifacts/ausd-wallet/android/app/build.gradle
    artifacts/ausd-wallet/android/app/debug.keystore
    artifacts/ausd-wallet/android/app/build.gradle:95:        versionCode 1
    artifacts/ausd-wallet/android/app/build.gradle:100:    signingConfigs {
    artifacts/ausd-wallet/android/app/build.gradle:102:            storeFile file('debug.keystore')
    artifacts/ausd-wallet/android/app/build.gradle:110:            signingConfig signingConfigs.debug
    artifacts/ausd-wallet/android/app/build.gradle:115:            signingConfig signingConfigs.debug
    ✗ (2) • 0ms

## Activity

    $ sed -n '80,125p' artifacts/ausd-wallet/android/app/build.gradle && keytool -list -v -keystore artifacts/ausd-wallet/android/app/debug.keystore -alias androiddebugkey -storepass android -keypass android | rg "SHA256|Alias name"
     * this variant is about 6MiB larger per architecture than default.
     */
    def jscFlavor = 'io.github.react-native-community:jsc-android:2026004.+'
    
    android {
        ndkVersion rootProject.ext.ndkVersion
    
        buildToolsVersion rootProject.ext.buildToolsVersion
        compileSdk rootProject.ext.compileSdkVersion
    
        namespace 'com.ausd.wallet'
        defaultConfig {
            applicationId 'com.ausd.wallet'
            minSdkVersion rootProject.ext.minSdkVersion
            targetSdkVersion rootProject.ext.targetSdkVersion
            versionCode 1
            versionName "1.0.0"
    
            buildConfigField "String", "REACT_NATIVE_RELEASE_LEVEL", "\"${findProperty('reactNativeReleaseLevel') ?: 'stable'}\""
        }
        signingConfigs {
            debug {
                storeFile file('debug.keystore')
                storePassword 'android'
                keyAlias 'androiddebugkey'
                keyPassword 'android'
            }
        }
        buildTypes {
            debug {
                signingConfig signingConfigs.debug
            }
            release {
                // Caution! In production, you need to generate your own keystore file.
                // see https://reactnative.dev/docs/signed-apk-android.
                signingConfig signingConfigs.debug
                def enableShrinkResources = findProperty('android.enableShrinkResourcesInReleaseBuilds') ?: 'false'
                shrinkResources enableShrinkResources.toBoolean()
                minifyEnabled enableMinifyInReleaseBuilds
                proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"
                def enablePngCrunchInRelease = findProperty('android.enablePngCrunchInReleaseBuilds') ?: 'true'
                crunchPngs enablePngCrunchInRelease.toBoolean()
            }
        }
        packagingOptions {
            jniLibs {
    /bin/bash: line 1: keytool: command not found
    ✗ (1) • 0ms

## Activity

    $ rg -n -F "FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C" . --glob '!**/node_modules/**' --glob '!codex-session-*' --glob '!coder.md' && git status --short && git log --oneline -8
    ✗ (1) • 0ms

## Activity

    $ git log --oneline -8
    79e6bb6 aded
    2e50bf4 added tools
    ee9200c feat: qr scanning
    564accb fixed task
    a6097e9 gottensha
    01345ad Update activity tracking and send transaction workflow in wallet app
    608c004 fixed
    0a169b8 added
    ✓ • 7.37s

## Activity

    $ rg -n -F "FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C" . --glob '!**/node_modules/**' --glob '!codex-session-*' --glob '!coder.md'
    ✗ (1) • 11.26s

## Activity

    $ git status --short
    ✓ • 0ms

## Activity

    $ git log -S "get_login_creds" --oneline -- artifacts/ausd-wallet .github/workflows/build-android-apk.yml
    2e50bf4 added tools
    3570d65 added aud
    ✓ • 304ms

## Activity

    $ git show --stat --oneline a6097e9
    a6097e9 gottensha
     .github/workflows/build-android-apk.yml            |     9 +
     artifacts/ausd-wallet/app/(tabs)/_layout.tsx       |    50 +-
     artifacts/ausd-wallet/app/(tabs)/savings.tsx       |     1 +
     artifacts/ausd-wallet/app/(tabs)/settings.tsx      |    22 +
     artifacts/ausd-wallet/app/(tabs)/swap.tsx          |     1 +
     artifacts/ausd-wallet/app/(tabs)/yield.tsx         |    19 +
     artifacts/ausd-wallet/app/create-account.tsx       |    74 +-
     artifacts/ausd-wallet/app/savings-goals.tsx        |   184 +-
     artifacts/ausd-wallet/services/passkey.ts          |    35 +
     artifacts/ausd-wallet/services/savings-pockets.ts  |   128 +
     artifacts/ausd-wallet/services/shared-pockets.ts   |    84 +
     ...x-session-01a1226f-72a5-7360-a0b6-5c3f1e0342.md | 10280 +++++++++++++++++++
     12 files changed, 10850 insertions(+), 37 deletions(-)
    ✓ • 3.50s

## Activity

    $ git log -S "PASSKEY_OPERATION_FAILED" --oneline -- artifacts/ausd-wallet/services/passkey.ts
    b588519 fixed ui
    ✓ • 0ms

## Activity

    $ sed -n '1,145p' artifacts/ausd-wallet/node_modules/react-native-passkey/android/src/main/java/com/reactnativepasskey/PasskeyModule.kt && sed -n '220,285p' artifacts/ausd-wallet/node_modules/react-native-passkey/lib/module/Passkey.js && sed -n '210,265p' artifacts/ausd-wallet/services/passkey.ts && sed -n '1,100p' artifacts/ausd-wallet/.gitignore
    package com.reactnativepasskey
    
    import com.facebook.react.bridge.ReactApplicationContext
    import com.facebook.react.bridge.ReactContextBaseJavaModule
    import com.facebook.react.bridge.ReactMethod
    import com.facebook.react.bridge.Promise
    
    import androidx.credentials.CredentialManager
    import androidx.credentials.CreatePublicKeyCredentialRequest
    import androidx.credentials.GetCredentialRequest
    import androidx.credentials.GetPublicKeyCredentialOption
    import androidx.credentials.SignalAllAcceptedCredentialIdsRequest
    import androidx.credentials.SignalUnknownCredentialRequest
    import androidx.credentials.exceptions.*
    import androidx.credentials.exceptions.domerrors.*
    import androidx.credentials.exceptions.publickeycredential.CreatePublicKeyCredentialDomException
    import androidx.credentials.exceptions.publickeycredential.GetPublicKeyCredentialDomException
    
    import kotlinx.coroutines.Dispatchers
    import kotlinx.coroutines.CoroutineScope
    import kotlinx.coroutines.launch
    
    import org.json.JSONArray
    import org.json.JSONObject
    
    class PasskeyModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
      private val mainScope = CoroutineScope(Dispatchers.Default)
    
      override fun getName(): String {
        return "Passkey"
      }
    
      @ReactMethod
      fun create(requestJson: String, forcePlatformKey: Boolean, forceSecurityKey: Boolean, promise: Promise) {
        val credentialManager = CredentialManager.create(reactApplicationContext.applicationContext)
        val createPublicKeyCredentialRequest = CreatePublicKeyCredentialRequest(requestJson)
    
        mainScope.launch {
          try {
            val activity = reactApplicationContext.currentActivity
              ?: run { promise.reject("RequestFailed", "No active Activity"); return@launch }
    
            val result = credentialManager.createCredential(activity, createPublicKeyCredentialRequest)
    
            val response =
              result.data.getString("androidx.credentials.BUNDLE_KEY_REGISTRATION_RESPONSE_JSON")
                ?: run { promise.reject("UnknownError", "Empty credential response"); return@launch }
            promise.resolve(response)
          } catch (e: CreateCredentialException) {
            val errorCode = handleRegistrationException(e)
            promise.reject(errorCode, e.errorMessage?.toString() ?: errorCode)
          } catch (e: Throwable) {
            promise.reject("UnknownError", e.message ?: "UnknownError")
          }
        }
      }
    
      private fun handleRegistrationException(e: CreateCredentialException): String {
        e.printStackTrace()
        when (e) {
          is CreatePublicKeyCredentialDomException -> {
            return mapDomError(e.domError)
          }
          is CreateCredentialCancellationException -> {
            return "UserCancelled"
          }
          is CreateCredentialInterruptedException -> {
            return "Interrupted"
          }
          is CreateCredentialProviderConfigurationException -> {
            return "NotConfigured"
          }
          is CreateCredentialUnknownException -> {
            return "UnknownError"
          }
          is CreateCredentialUnsupportedException -> {
            return "NotSupported"
          }
          is CreateCredentialNoCreateOptionException -> {
            // No credential provider offered to create a passkey — e.g. Google Password Manager
            // with no Google account signed in, or no provider installed at all. Without a stable
            // code here the JS side only receives the localized errorMessage, which it cannot
            // branch on to offer a password fallback.
            return "NoCreateOption"
          }
          else -> {
            // Fall back to the androidx type constant rather than the human-readable message:
            // `type` is a stable identifier, `errorMessage` is display text that may change.
            return e.type
          }
        }
      }
    
      @ReactMethod
      fun get(requestJson: String, forcePlatformKey: Boolean, forceSecurityKey: Boolean, preferImmediatelyAvailable: Boolean, promise: Promise) {
          val credentialManager = CredentialManager.create(reactApplicationContext.applicationContext)
          val getCredentialRequest =
            GetCredentialRequest(
              listOf(GetPublicKeyCredentialOption(requestJson)),
              preferImmediatelyAvailableCredentials = preferImmediatelyAvailable
            )
    
          mainScope.launch {
            try {
              val activity = reactApplicationContext.currentActivity
                ?: run { promise.reject("RequestFailed", "No active Activity"); return@launch }
    
              val result = credentialManager.getCredential(activity, getCredentialRequest)
    
              val response =
                result.credential.data.getString("androidx.credentials.BUNDLE_KEY_AUTHENTICATION_RESPONSE_JSON")
                  ?: run { promise.reject("UnknownError", "Empty credential response"); return@launch }
              promise.resolve(response)
            } catch (e: GetCredentialException) {
              val errorCode = handleAuthenticationException(e)
              promise.reject(errorCode, e.errorMessage?.toString() ?: errorCode)
            } catch (e: Throwable) {
              promise.reject("UnknownError", e.message ?: "UnknownError")
            }
          }
      }
    
      /**
       * WebAuthn Signal API: tells OS credential managers a credential the relying party no longer
       * recognizes should be removed/hidden. `credentialId` is a base64url string; the platform
       * decodes it. Best-effort — resolves once the request is accepted.
       *
       * Use when unauthenticated / after a failed sign-in (single credential, no user handle). For the
       * authenticated full-set reconcile, use [signalAllAcceptedCredentials] instead.
       */
      @ReactMethod
      fun signalUnknownCredential(rpId: String, credentialId: String, promise: Promise) {
        val credentialManager = CredentialManager.create(reactApplicationContext.applicationContext)
        val requestJson = JSONObject().apply {
          put("rpId", rpId)
          put("credentialId", credentialId)
        }.toString()
    
        mainScope.launch {
          try {
            credentialManager.signalCredentialState(SignalUnknownCredentialRequest(requestJson))
            promise.resolve(null)
          } catch (e: Exception) {
            promise.reject("SignalFailed", e.message ?: "signalUnknownCredential failed", e)
          }
       */
      static async signalUnknownCredential(request) {
        return NativePasskey.signalUnknownCredential(request.rpId, request.credentialId);
      }
    
      /**
       * Reports the complete set of credential ids the relying party still accepts for
       * a given user (WebAuthn Signal API). OS credential managers remove / hide any
       * stored credentials not in the list (reversible — re-add an id to restore; an
       * empty list hides all).
       *
       * Use this when **authenticated** (after login, or after adding / deleting a
       * passkey): it needs the user handle and the full accepted set, so it
       * authoritatively prunes. For a single credential when unauthenticated, use
       * `signalUnknownCredential` instead.
       *
       * This is best-effort and resolves once the request is accepted. It no-ops on OS
       * versions without Signal API support (iOS < 26).
       *
       * @param request The relying party id, the base64URL encoded user handle and the
       * base64URL encoded credential ids still accepted by the server
       * @returns A Promise that resolves once the signal has been delivered
       * @throws
       */
      static async signalAllAcceptedCredentials(request) {
        return NativePasskey.signalAllAcceptedCredentials(request.rpId, request.userId, JSON.stringify(request.allAcceptedCredentialIds));
      }
    
      /**
       * Checks if Passkeys are supported on the current device
       *
       * @returns A boolean indicating whether Passkeys are supported
       */
      static isSupported() {
        if (Platform.OS === 'android') {
          return Platform.Version >= 28;
        }
        if (Platform.OS === 'ios') {
          return parseInt(Platform.Version, 10) >= 15;
        }
        return false;
      }
    }
    //# sourceMappingURL=Passkey.js.map}
    
    async function createKernelAccount(owner: ReturnType<typeof toViemAccount>) {
      return toKernelSmartAccount({
        client: publicClient,
        entryPoint,
        owners: [owner],
        version: '0.3.1',
      });
    }
    
    export async function createMeraPasskey(name: string, email: string): Promise<MeraAccount> {
      await assertPlatformSupport();
      const rpId = getRelyingPartyId();
      if (!rpId) {
        throw new Error(
          'Passkey setup needs a verified HTTPS domain. Configure EXPO_PUBLIC_RP_ID and publish the iOS and Android domain association files for that domain.',
        );
      }
      await assertNativeRpAssociation(rpId);
    
      const mera = await import('@category-labs/mera');
      const webAuthnClient = await getNativeWebAuthnClient();
      const created = await mera.createPasskeyWithPrfOutput({
        rp: { id: rpId, name: 'AUSD Wallet' },
        user: { name: email, displayName: name },
        ...(webAuthnClient ? { webAuthnClient } : {}),
      });
    
      const signer = signerFromPrf(mera, created.prfOutput);
      try {
        const kernelAccount = await createKernelAccount(signer.owner);
        return {
          address: kernelAccount.address,
          signerAddress: signer.owner.address,
          rpId,
          credential: {
            credentialId: created.credentialId,
            ...(created.transports ? { transports: [...created.transports] } : {}),
          },
        };
      } finally {
        signer.session.end();
      }
    }
    
    /**
     * Recover an account from any discoverable passkey synced to this RP.
     * Omitting credential metadata lets the platform choose the user's existing
     * passkey instead of requiring a profile from the previous device.
     */
    export async function recoverMeraPasskey(): Promise<MeraAccount> {
      await assertPlatformSupport();
      const rpId = getRelyingPartyId();
      if (!rpId) {
        throw new Error(
    # Learn more https://docs.github.com/en/get-started/getting-started-with-git/ignoring-files
    
    # dependencies
    node_modules/
    
    # Expo
    .expo/
    dist/
    web-build/
    expo-env.d.ts
    
    # Native
    ios/
    android/
    *.orig.*
    *.jks
    *.p8
    *.p12
    *.key
    *.mobileprovision
    
    # Metro
    .metro-health-check*
    
    # debug
    npm-debug.*
    yarn-debug.*
    yarn-error.*
    
    # macOS
    .DS_Store
    *.pem
    
    # local env files
    .env*.local
    
    # typescript
    *.tsbuildinfo
    .vercel
    
    .env
    ✓ • 332ms

## Activity

    $ rg -n "createPlatformKey|forcePlatformKey|function create" artifacts/ausd-wallet/node_modules/react-native-passkey/lib/module/Passkey.js artifacts/ausd-wallet/node_modules/react-native-passkey/src -g '*.ts' -g '*.js' && sed -n '1,120p' artifacts/ausd-wallet/node_modules/react-native-passkey/lib/module/Passkey.js && sed -n '160,225p' artifacts/ausd-wallet/node_modules/react-native-passkey/README.md && sed -n '1,80p' .github/workflows/build-android-apk.yml
    rg: artifacts/ausd-wallet/node_modules/react-native-passkey/src: No such file or directory (os error 2)
    artifacts/ausd-wallet/node_modules/react-native-passkey/lib/module/Passkey.js:20:      // forcePlatformKey
    artifacts/ausd-wallet/node_modules/react-native-passkey/lib/module/Passkey.js:41:  static async createPlatformKey(request) {
    artifacts/ausd-wallet/node_modules/react-native-passkey/lib/module/Passkey.js:47:      // forcePlatformKey
    artifacts/ausd-wallet/node_modules/react-native-passkey/lib/module/Passkey.js:74:      // forcePlatformKey
    artifacts/ausd-wallet/node_modules/react-native-passkey/lib/module/Passkey.js:100:      // forcePlatformKey
    artifacts/ausd-wallet/node_modules/react-native-passkey/lib/module/Passkey.js:133:      // forcePlatformKey (immediate is platform-only)
    artifacts/ausd-wallet/node_modules/react-native-passkey/lib/module/Passkey.js:162:      // forcePlatformKey
    artifacts/ausd-wallet/node_modules/react-native-passkey/lib/module/Passkey.js:191:      // forcePlatformKey
    ✗ (2) • 0ms

## Activity

    $ sed -n '1,115p' artifacts/ausd-wallet/node_modules/react-native-passkey/lib/module/Passkey.js
    import { handleNativeError, NotSupportedError } from './PasskeyError';
    import { Platform } from 'react-native';
    import { stringifyPasskeyRequest } from './PasskeyRequest';
    import { NativePasskey } from './NativePasskey';
    export class Passkey {
      /**
       * Creates a new Passkey
       *
       * @param request The FIDO2 Attestation Request in JSON format
       * @param options An object containing options for the registration process
       * @returns The FIDO2 Attestation Result in JSON format
       * @throws
       */
      static async create(request) {
        if (!Passkey.isSupported()) {
          throw NotSupportedError;
        }
        try {
          const response = await NativePasskey.create(stringifyPasskeyRequest(request, Platform.OS), false,
          // forcePlatformKey
          false // forceSecurityKey
          );
          if (typeof response === 'string') {
            return JSON.parse(response);
          }
          return response;
        } catch (error) {
          throw handleNativeError(error);
        }
      }
    
      /**
       * Creates a new Passkey
       * Forces the usage of a platform authenticator on iOS
       *
       * @param request The FIDO2 Attestation Request in JSON format
       * @param options An object containing options for the registration process
       * @returns The FIDO2 Attestation Result in JSON format
       * @throws
       */
      static async createPlatformKey(request) {
        if (!Passkey.isSupported()) {
          throw NotSupportedError;
        }
        try {
          const response = await NativePasskey.create(stringifyPasskeyRequest(request, Platform.OS), true,
          // forcePlatformKey
          false // forceSecurityKey
          );
          if (typeof response === 'string') {
            return JSON.parse(response);
          }
          return response;
        } catch (error) {
          throw handleNativeError(error);
        }
      }
    
      /**
       * Creates a new Passkey
       * Forces the usage of a security authenticator on iOS
       *
       * @param request The FIDO2 Attestation Request in JSON format
       * @param options An object containing options for the registration process
       * @returns The FIDO2 Attestation Result in JSON format
       * @throws
       */
      static async createSecurityKey(request) {
        if (!Passkey.isSupported()) {
          throw NotSupportedError;
        }
        try {
          const response = await NativePasskey.create(stringifyPasskeyRequest(request, Platform.OS), false,
          // forcePlatformKey
          true // forceSecurityKey
          );
          if (typeof response === 'string') {
            return JSON.parse(response);
          }
          return response;
        } catch (error) {
          throw handleNativeError(error);
        }
      }
    
      /**
       * Authenticates using an existing Passkey
       *
       * @param request The FIDO2 Assertion Request in JSON format
       * @param options An object containing options for the authentication process
       * @returns The FIDO2 Assertion Result in JSON format
       * @throws
       */
      static async get(request) {
        if (!Passkey.isSupported()) {
          throw NotSupportedError;
        }
        try {
          const response = await NativePasskey.get(stringifyPasskeyRequest(request, Platform.OS), false,
          // forcePlatformKey
          false,
          // forceSecurityKey
          false // preferImmediatelyAvailable
          );
          if (typeof response === 'string') {
            return JSON.parse(response);
          }
          return response;
        } catch (error) {
          throw handleNativeError(error);
        }
      }
    
      /**
       * Authenticates using an existing Passkey, but only if a credential is
    ✓ • 0ms
