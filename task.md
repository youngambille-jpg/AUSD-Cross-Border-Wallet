# Wallet Tasks

## Current

- [x] Redesign the home dashboard with total balance, Deposit/Transfer/Swap actions, savings goals, AUSD/USDC assets, and recent activity.
- [ ] Confirm Mera passkey creation and account persistence on a physical Android device after validating the RP domain association.
- [ ] Verify the GitHub Actions APK signing certificate fingerprint is published in the RP domain’s `assetlinks.json` for `com.ausd.wallet`.

## Product Roadmap

1. [ ] Make AUSD and USDC balances, receive, and transfer token-aware on Monad; add USDT only after verifying a supported deployment for the active network.
2. [ ] Build goal savings pockets using Mera-derived accounts; use a contract if a goal needs enforced lock or withdrawal rules.
   - [x] Add private savings goal creation, progress tracking, balance-based allocation checks, and encrypted local backup/restore.
   - [x] Encrypt goal state as non-wallet app data with a Mera PRF-derived secret vault; only the encrypted vault is persisted.
   - [x] Start a Hardhat contract package for funded AUSD pockets controlled by the user's Mera-owned smart account.
   - [x] Define the first contract flow: create pocket, deposit, withdraw, send with percentage auto-save, and gift to an existing pocket.
   - [ ] Compile/review the contract, then add focused contract tests before deployment.
   - [ ] Integrate the contract with sponsored Mera UserOperations and show payment, auto-save, and total debit before signing.
   - [ ] Verify create, reopen, and backup restore with the same passkey on a second physical device/browser profile.
   - [ ] Replace tracking-only savings contributions with on-chain deposits once the contract is reviewed and wired into the app.
   - [ ] Add enforced withdrawal/lock rules on-chain only if product requirements call for them.
3. [ ] Add stablecoin swaps on Monad with a quote, minimum received amount, and clear confirmation.
4. [ ] Add Aurora Intents for cross-chain deposits into Monad, with route quotes and transfer status.
5. [ ] Extend Envio activity indexing for supported tokens and savings accounts.
6. [ ] Add username-to-address resolution for in-app transfers, with recipient confirmation before signing.

## Product Focus

- Primary track: Consumer Products & Payments.
- Keep stablecoin savings, deposits, and peer transfers as the main user experience; expose trading and bridge infrastructure only when the related flows are ready.
- Never store Mera PRF output, seed phrases, or derived private keys in app storage or logs.
