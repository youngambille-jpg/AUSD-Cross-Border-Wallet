# AUSD Wallet: Metropolis Product and Build Plan

## Product direction

Build **AUSD Wallet** as a mobile-first, passkey-native way to hold and move dollar value across borders. The first product promise is simple: create an account with a device passkey, receive AUSD, and send it instantly without needing a seed phrase or MON for gas. Agora settlement provides the cross-border payout rail; the app should make the quote, destination asset, status, and receipt understandable to a non-crypto user.

The app already has the hard demo foundation: Mera passkey-derived smart accounts, sponsored AUSD sends, an Agora AUSD-to-CTK testnet settlement flow, and a mobile UI. The next product direction is cross-chain payments with Aurora: let a user fund their Monad AUSD account from supported crypto assets, then send AUSD value to a recipient in a supported asset on another chain. Build around reliability, recovery, and clear receipts. Keep the product honest about which steps are testnet, simulated, or live.

**Scope boundary:** Aurora routes supported on-chain token assets. This does not by itself let a user receive bank fiat or withdraw to a bank/mobile-money account; those require a separate fiat provider such as Alchemy Pay and supported regional rails. Say “supported crypto assets” in the product until fiat payout is actually integrated.

## Product principles

1. **Mera is the account layer.** No seed phrase, wallet extension, custody backend, email/OTP gate, or app-controlled private key. Profile information may personalize the app, but it must not be needed to recover account identity.
2. **One obvious money action.** Home should make Send the primary action, with direct AUSD transfer and Agora cross-border settlement as clear choices.
3. **Show the outcome before authorization.** Before a passkey prompt, show amount, recipient, source and destination assets, quote expiry, fees, expected output, and who pays network fees.
4. **Receipts are the source of truth.** Pending, confirmed, and failed states must reflect chain/API evidence. Never present a locally saved preview as a settled payment.
5. **Expand one corridor at a time.** Choose a real sender/recipient corridor, validate available payout methods and compliance, and only then generalize the flow.

## Navigation recommendation

Use four persistent destinations once their flows are real:

| Tab | Purpose |
| --- | --- |
| **Home** | AUSD balance, prominent **Send** action, recent transfers, and useful add/withdraw shortcuts. |
| **Activity** | Searchable transfer history, status filters, and durable receipts for direct sends and settlement payouts. |
| **Move** | A compact action hub: **Send AUSD**, **Cross-border**, **Add money**, and **Cash out**. Keep Send reachable from Home too. |
| **Profile** | Passkey/account details, recovery and session controls, network/provider status, support, and legal/compliance information. |

Until fiat onramp/offramp is actually connected, keep those choices clearly marked as unavailable or in a preview area; do not imply that a bank/card payout can complete. When those flows are available in supported regions, promote them in Move. Avoid using separate bottom tabs for Add and Cash out: they are two variants of the same money-in/money-out action area, and separate tabs consume room needed for Activity and account controls.

## Recommended user flows

### First use and return

1. A short intro explains AUSD, passkey security, and the testnet/demo status.
2. **Create wallet** starts one Mera passkey ceremony. Do not require email just to create or recover the wallet; collect optional contact information later only for a clear product need and with consent.
3. Land on Home with a clear next step: **Receive AUSD** (copy/share smart-account address) or **Send** once funded.
4. On a new device, use the passkey to reconstruct the same signer/account. Treat local storage as a cache for display preferences and non-secret transaction metadata, never as the sole source of identity. Include an explicit fresh-install/fresh-device recovery test in the release checklist.

### Direct AUSD send

Home → **Send** → recipient (paste address or select saved contact) → amount → review → passkey approval → sponsored transaction status → receipt. Validate address and available balance before review. Show an address identicon/shortened address and a final confirmation step to reduce wrong-recipient errors. A receipt should include amount, recipient, transaction hash, explorer link, and confirmed timestamp.

### Agora cross-border settlement

Home → **Send** → **Cross-border** → choose supported destination/currency or payout asset → recipient details → amount → live quote → review → Mera authorization → sponsored settlement → receipt. Show what Agora actually settles (currently a Monad testnet AUSD-to-CTK mock flow) and avoid describing CTK as fiat or claiming delivery to a bank/mobile-money recipient until an actual payout partner completes that leg. Refresh and re-confirm if the quote changes or expires.

### Cross-chain receive and pay with Aurora

**Receive:** Home → **Receive** → choose a supported source chain → get a persistent deposit address that routes the selected supported asset into the user's AUSD smart account on Monad → share address/QR → show deposit detection, route processing, delivered AUSD, and any refund/failure state in Activity. Aurora's persistent addresses are chain-specific and reusable; they can accept supported assets for a configured destination and output asset. Verify that AUSD on Monad is present and quoteable before designing this as a live route.

**Pay across chains:** Home → **Send** → **Pay on another chain** → enter recipient address and destination chain/token → show Aurora's quote, amount received, fees, slippage, route, and expiry → user approves the source AUSD transfer from their Mera smart account to Aurora's deposit address → track the route until delivery or refund → show the destination transaction link in Activity. The user is paying from AUSD on Monad; the recipient can receive only an asset/chain that Aurora currently supports and can quote.

For the first release, use one well-supported inbound source asset to AUSD on Monad and one outbound destination asset/corridor from AUSD on Monad. Fetch supported token IDs from Aurora's API rather than hard-coding a claim of “any coin.” Add arbitrary source-coin spending later only if its wallet authorization path works with the Mera account model. Use Intents Connect for a later bounded destination action (deposit-and-execute), after basic transfer routes and tracking are reliable.

### Fiat add money and cash out

Move → **Add money** or **Cash out** → region and supported method → provider quote/fees/limits → required identity checks → explicit provider handoff/authorization → pending status → completion or failure receipt. First select one launch region/corridor and verify Alchemy Pay's current supported fiat rails, assets, KYC requirements, fees, and SDK/API fit. Build the provider integration behind a clear adapter so other on/off-ramp providers can be added without rewriting wallet/account logic. Until a provider flow is connected end-to-end, label these as preview and keep amounts out of the wallet balance.

### Receive

Home → **Receive** → show QR and copyable smart-account address, chain/network, and AUSD token. Add a share sheet and plain-language warning if the sender must use Monad. Later, add a persistent cross-chain deposit address via Aurora only after its deposit-and-execute flow is understood and observable in Activity.

## Build sequence

### Phase 1 — Make the existing money flows trustworthy (next)

- Finish UI consistency on onboarding, Home, send/review, pending, success/failure, Activity, and Profile.
- Make account creation truly one-prompt: remove any mandatory email step that is not required by Mera; make optional identity fields clearly optional.
- Prove the stateless test: clear app data or install on a fresh device, authenticate with the same passkey, reconstruct the same account/address, and see the right AUSD balance.
- Review Mera signing-session behavior. If sessions are used, scope them to the minimum actions, amount limits, and expiry needed; make session expiry/re-auth recovery calm and explicit. Do not silently broaden session permissions.
- Add robust transaction lifecycle states: quote loading/expiry, wallet approval, submitted, confirmed, reverted, retryable provider failure, and unknown/pending. Keep idempotency and duplicate-submit protection in the transaction layer.
- Keep the demo wallet visibly separate from the real Mera testnet account. Never mix local demo balance/history with on-chain balance/history.

**Exit criteria:** a first-time user can reach a confirmed sponsored AUSD transfer quickly; a second device can restore access from the passkey; a failed or pending transfer is never shown as complete.

### Phase 2 — Receive supported crypto as AUSD through Aurora

- Check Aurora's live supported-token list and obtain a quote for one inbound route into the Monad AUSD smart account. Do not assume support for every token just because its chain is listed.
- Prototype one persistent, chain-specific deposit address and verify that the source asset, destination chain (Monad), and output asset (AUSD) are all supported by the live API.
- Add a receive screen with the source network and asset clearly named, address/QR, copy/share actions, and a warning that only compatible assets on the selected source chain should be sent.
- Persist the Aurora address identity and transaction reference safely so the same user's receiving route can be reconstructed after reinstall. Keep the Mera smart-account address as the output recipient.
- Display Aurora's real lifecycle: awaiting deposit, deposit detected, processing, delivered, incomplete, refunded, or failed. Reconcile status from Aurora; don't mark an incoming transfer complete based on a local tap.
- Make the first corridor work end to end with a real test deposit before adding more chains/assets.

**Exit criteria:** one test deposit from a supported non-Monad source asset completes routing and credits AUSD to the user's Monad smart account, and the app can recover and show the final status after restart.

### Phase 3 — Pay a recipient in a supported cross-chain asset

- Add a separate **Pay on another chain** path that spends AUSD from the user's Mera smart account on Monad and targets a recipient address plus a supported destination asset/chain.
- Fetch Aurora's current supported asset IDs; request and display the exact quote, output, fees, slippage, route, deadline, and refund behavior before passkey approval.
- Transfer AUSD to Aurora's quoted deposit address with the existing smart-account signing/sponsorship path only after verifying the contract and transaction semantics for the route.
- Track source deposit, intent processing, destination delivery, and refund as distinct states in Activity, including both source and destination transaction references when available.
- Add arbitrary source-coin payments only after confirming a safe Mera authorization path for those origin chains. The first cross-chain send remains AUSD-on-Monad → selected supported recipient asset.
- Add Intents Connect deposit-and-execute as a later step once ordinary deposit and payment routes are reliable.

**Exit criteria:** a user can approve one quoted AUSD-on-Monad payment to a recipient's supported asset on another chain and see a verifiable delivered or refunded outcome.

### Phase 4 — Make Agora settlement the standout cross-border experience

- Confirm the public Agora API/contract requirements and document the exact testnet flow, supported assets, quote validity, and transaction evidence.
- Design around a real recipient/corridor model, even if the current payout leg remains a testnet mock. Make the conversion and recipient outcome legible before signing.
- Store durable receipt data keyed by transaction/settlement ID. Reconcile local display with chain/API status after app restart and network interruption.
- Add a one-tap repeat flow only after the prior recipient and route are shown for confirmation.
- Demo the happy path and one useful failure path (expired quote or rejected authorization) in addition to onboarding and a completed transfer.

**Exit criteria:** a judge can see passkey onboarding, AUSD balance, a reviewed cross-border quote, passkey approval, instant testnet settlement, and a verifiable receipt without being told to trust a local success screen.

### Phase 5 — Add dependable fiat money-in and money-out

- Confirm Alchemy Pay coverage for the first intended user market, including fiat currencies, AUSD availability, card/bank methods, KYC, fees, limits, refunds, settlement timing, and mobile handoff behavior.
- Integrate one direction and one corridor end-to-end first (choose the side with the best confirmed provider support); implement webhooks/status reconciliation, cancellation/error states, and support references before adding more corridors.
- Add a provider-neutral on/off-ramp boundary and keep provider keys/secrets on a server where required; never ship privileged secrets in the mobile bundle.
- Clearly distinguish payment-provider status from on-chain AUSD settlement. Update the spendable balance only when funds are actually received and confirmed.

**Exit criteria:** a user can complete a real supported fiat-to-AUSD or AUSD-to-fiat flow in the selected region with transparent fees and a traceable receipt. Do not claim this from a UI mock or sandbox-only run.

### Phase 6 — Strengthen the Alchemy integration for the Alchemy bounty and production

- The repository already supports an Alchemy Monad RPC URL for reads, with a public RPC fallback. Make the configured provider visible and verify the actual app build/demo uses it; document which user-facing reads depend on it.
- Check the current bounty wording and Alchemy's current Monad product support before choosing a qualifying service. A configured RPC can be real use, but do not assume it alone satisfies a requirement for a *meaningful* integration.
- Prefer a concrete user benefit that fits the app: reliable AUSD balance/transaction reads and Activity reconciliation, or supported notifications/webhooks for transfer status. Keep an RPC fallback and show stale/unavailable data honestly.
- Keep Mera as the signer/account layer and preserve the existing sponsor integration unless a verified Alchemy product supports this exact Monad network, Kernel/EntryPoint version, and Mera signing path. Do not swap AA providers just to add a logo or risk breaking the working flow.

**Exit criteria:** the submission can point to a working Alchemy service in the running product, explain how it improves a core payment flow, and show provider configuration/observable behavior. Recheck the official bounty page before submission.

## Account stack and security direction

- **Mera:** identity, passkey ceremony, and signing authority. Validate credential recovery from an untrusted device and explain exactly when a passkey prompt appears.
- **Smart account:** keep the Kernel account as the stable receiving identity; make account address derivation deterministic and regression-check it across reinstalls/devices.
- **Gas sponsorship:** maintain tight policies for allowed contracts, methods, networks, and spend limits. Explain sponsorship as “no MON needed for this transfer” rather than hiding failure conditions.
- **Agora:** settlement quote and testnet settlement flow. Recheck quotes at execution time and make asset/corridor constraints explicit.
- **Alchemy:** use a current supported Alchemy Monad service for a visible reliability/data capability. The app currently has optional Alchemy RPC reads; validate bounty eligibility rather than overstating it.
- **Recovery:** passkey-based reconstruction first; later consider a user-chosen additional passkey/device or trusted recovery method. Do not add a custodial recovery backend that contradicts the Mera bounty.
- **Aurora:** receive supported source-chain assets as AUSD on Monad, then pay supported destination assets from AUSD with explicit intent status and refund handling.

## What to emphasize in the submission

### Agora Payments bounty

Lead with a consumer cross-border payment demo: Mera onboarding → AUSD balance → recipient and quote → instant Agora settlement → verifiable receipt. Be precise that testnet CTK is a mock payout asset, and describe what is simulated versus completed on-chain. Explain the real-world corridor and provider plan briefly as the commercial path.

### Mera UX bounty

Show one passkey ceremony, no seed phrase/extension/custody backend, prompt-free actions only where a clearly scoped session permits them, a clear re-prompt/session-expiry experience, and the fresh-device stateless test. Make the smart-account and sponsored-gas composition visible in the demo without turning the app into a stack diagram.

### Alchemy bounty

Show the Alchemy product being used in the actual deployed app and name the concrete payment experience it improves. Existing optional Alchemy-backed Monad reads are a useful starting point; verify that they meet the official bounty's definition of meaningful use and that the deployed build has the Alchemy endpoint configured.

Keep the video under two minutes: passkey onboarding, funded/balance state, one send/settlement, and the receipt. Avoid spending the demo on roadmap slides.

## Product and engineering measures

- Time from first launch to usable smart-account address; time to first confirmed send.
- Passkey setup and recovery success rate on supported iOS/Android devices.
- Quote-to-confirm completion, quote expiry rate, failed settlement rate, and median time to confirmed receipt.
- Sponsored transaction success rate and sponsor cost per successful transfer.
- Fiat on/off-ramp completion and failure reasons by corridor once integrated.
- Support incidents for wrong recipient, delayed payment, and recovery.

## Explicitly defer

- Broad multi-chain support before one inbound and one outbound cross-chain route are reliable.
- Multiple fiat providers/countries before the first corridor is operational.
- Yield, cards, token swaps unrelated to the payment promise, and speculative AI features.
- Marketing language implying fiat delivery, universal availability, or zero-risk settlement where the current product only has a testnet mock.

## Reference links

- [Monad Metropolis](https://monad.xyz/developers/hackathons/metropolis)
- [Agora documentation](https://docs.agora.finance/)
- [Mera getting started](https://mera.category.xyz/getting-started/)
- [Mera React Native recipe](https://mera.category.xyz/recipes/use-mera-with-react-native/)
- [Alchemy on Monad](https://www.alchemy.com/monad)
- [Alchemy Wallet API supported chains](https://www.alchemy.com/docs/wallets/supported-chains)
- [Aurora Intents](https://docs.intents.aurora.dev/)
- [Aurora Intents Deposits](https://docs.intents.aurora.dev/intents-deposits/what-are-intents-deposits.md)
- [Persistent deposit addresses](https://docs.intents.aurora.dev/intents-deposits/persistent-addresses.md)
- [Aurora supported deposit chains](https://docs.intents.aurora.dev/intents-deposits/supported-chains.md)
- [Aurora deposit API integration](https://docs.intents.aurora.dev/intents-deposits/quickstart/api-integration.md)
- [Aurora API keys and fees](https://docs.intents.aurora.dev/getting-started/api-keys-and-fees.md)
