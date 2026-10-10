# Wallet Tasks

## Current

- [x] Redesign the home dashboard with total balance, Deposit/Transfer/Swap actions, savings goals, AUSD/USDC assets, and recent activity.
- [x] Confirm Mera passkey creation and account persistence on a physical Android device after validating the RP domain association.
- [x] Verify the GitHub Actions APK signing certificate fingerprint is published in the RP domain’s `assetlinks.json` for `com.ausd.wallet`.

## Product Roadmap

1. [ v] Make AUSD and USDC balances, receive, and transfer token-aware on Monad; add USDT only after verifying a supported deployment for the active network.
   - [x] Display AUSD and USDC balances on Monad.
   - [ ] Make receive and transfer flows token-selectable for AUSD and USDC.
   - [ ] Add USDT only after verifying a supported deployment for the active network.
2. [ ] Build goal savings pockets using Mera-derived accounts; use a contract if a goal needs enforced lock or withdrawal rules.
   - [x] Add private savings goal creation, progress tracking, balance-based allocation checks, and encrypted local backup/restore.
   - [x] Encrypt goal state as non-wallet app data with a Mera PRF-derived secret vault; only the encrypted vault is persisted.
   - [x] Start a Hardhat contract package for funded AUSD pockets controlled by the user's Mera-owned smart account.
   - [x] Define the first contract flow: create pocket, deposit, withdraw, send with percentage auto-save, gift to a person, and gift to an existing goal pocket.
   - [x] Compile the contract and add focused integration tests for auto-save, person gifts, goal gifts, and withdrawals.
   - [x] Deploy the fee-free savings contract to Monad testnet; deployment address and receipt are recorded with the contract package.
    - [x] Integrate the contract with sponsored Mera UserOperations and show payment, auto-save, and total debit before signing.
   - [x] Add a Mera-encrypted contacts book mapping user-chosen names to smart-account addresses, with backup/restore and send prefill.
   - [x] Reuse saved contacts across transfers and gifts, with recipient confirmation before signing.
   - [ ] Reuse saved contacts across bill splits and tips.
   - [x] Add shareable goal links/codes that identify a recipient account and pocket so contacts can fund a specific goal.
   - [x] Verify create, reopen, and backup restore with the same passkey on a second physical device/browser profile.
   - [x] Replace active-goal tracking-only contributions with on-chain deposits; older unlinked goals remain clearly labeled as local-only.
   - [x] Make Savings a primary tab that lists the user's own on-chain pockets and supports deposits and payment auto-save.
   - [x] Let users gift a contact, fund another user's pocket from shared pocket details, and locally track shared pocket balances.
   - [x] Add Yield and Settings navigation placeholders for a later feature phase.
   - [ ] Add enforced withdrawal/lock rules on-chain only if product requirements call for them.
3. [ ] Add stablecoin swaps on Monad with a quote, minimum received amount, and clear confirmation.
   - [x] Add the Agora AUSD-to-CTK Monad testnet swap with a quote, minimum output, and confirmation review.
   - [ ] Add a stablecoin-to-stablecoin swap after supported Monad liquidity is verified.
4. [x] Add Aurora Intents for cross-chain deposits into Monad, with route quotes and transfer status.
5. [ ] Extend Envio activity indexing for supported tokens and savings accounts.
   - [x] Index AUSD and CTK token transfers.
   - [ ] Index SavingsPockets events and expose pocket activity.
6. [x] Add reusable in-app contacts for transfers and gift payments, with recipient confirmation before signing.
   - [ ] Extend contacts to bill splits and tips.

## Product Focus

- Primary track: Consumer Products & Payments.
- Keep stablecoin savings, deposits, and peer transfers as the main user experience; expose trading and bridge infrastructure only when the related flows are ready.
- Never store Mera PRF output, seed phrases, or derived private keys in app storage or logs.
