# Wallet Tasks

## Current

- [x] Redesign the home dashboard with total balance, Deposit/Transfer/Swap actions, savings goals, AUSD/USDC assets, and recent activity.
- [ ] Confirm Mera passkey creation and account persistence on a physical Android device after validating the RP domain association.
- [ ] Verify the GitHub Actions APK signing certificate fingerprint is published in the RP domain’s `assetlinks.json` for `com.ausd.wallet`.

## Product Roadmap

1. [ ] Make AUSD and USDC balances, receive, and transfer token-aware on Monad; add USDT only after verifying a supported deployment for the active network.
2. [ ] Build goal savings pockets using Mera-derived accounts; use a contract if a goal needs enforced lock or withdrawal rules.
3. [ ] Add stablecoin swaps on Monad with a quote, minimum received amount, and clear confirmation.
4. [ ] Add Aurora Intents for cross-chain deposits into Monad, with route quotes and transfer status.
5. [ ] Extend Envio activity indexing for supported tokens and savings accounts.
6. [ ] Add username-to-address resolution for in-app transfers, with recipient confirmation before signing.

## Product Focus

- Primary track: Consumer Products & Payments.
- Keep stablecoin savings, deposits, and peer transfers as the main user experience; expose trading and bridge infrastructure only when the related flows are ready.
- Never store Mera PRF output, seed phrases, or derived private keys in app storage or logs.
