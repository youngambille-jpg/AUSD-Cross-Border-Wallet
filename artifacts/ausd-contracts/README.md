# AUSD savings pockets

Hardhat project for the Monad testnet savings pocket contract.

## Product and Mera model
The Mera passkey derives the user's signing authority. The existing Kernel smart account is the on-chain owner and caller; it signs UserOperations that call this contract. A pocket is an ID in the contract's ledger, not a second private key or a separately derived wallet. That keeps one passkey as the account layer and avoids persisting new key material.

`payWithAutoSave` treats the amount entered by the user as the amount the recipient receives. It adds the configured percentage on top, moving that extra AUSD into the selected pocket in the same transaction. The review UI should show recipient amount, saved amount, and total debit before confirmation. The smart account must approve this contract for the total debit; the wallet should batch approval and the contract call in one sponsored UserOperation where supported.

Gifting has two paths. `giftToPerson` credits a recipient smart account even if they have not created a pocket or initialized the app; they can later allocate the gift to one of their own pockets or withdraw it. `gift` sends directly to an existing goal pocket, which lets another person fund that goal. Only the smart account that owns the pocket can withdraw goal funds. The app's username-to-account lookup and shareable goal selection live outside this contract; the contract uses smart-account addresses for authorization. The contract holds funds directly and has no admin withdrawal path. It does not integrate a yield strategy; a future yield tab should use a separately reviewed adapter/vault flow and make protocol risks and withdrawal availability explicit.

The planned identity UX is a user-managed contacts book, not a global username database: save a person's display name with their confirmed smart-account address and reuse that contact for transfers, bill splits, gifts, and tips. Persist that book encrypted with the user's Mera passkey so it survives app restarts and can be restored on another device. Funding a specific goal still needs a shareable goal link/code that identifies the recipient account and pocket; a saved person contact alone should only enable a person-level gift.

## Commands and configuration

- `pnpm --filter @workspace/ausd-contracts compile`
- `pnpm --filter @workspace/ausd-contracts test`
- `pnpm --filter @workspace/ausd-contracts deploy:testnet` (requires `DEPLOYER_PRIVATE_KEY`)
- Monad testnet is chain ID `10143`.
- `MONAD_TESTNET_RPC_URL` optionally overrides the public testnet RPC.
- `AUSD_TESTNET_ADDRESS` optionally overrides the configured Monad testnet AUSD address; deployment checks contract code and six decimals before sending.
- `DEPLOYER_PRIVATE_KEY` is for deployment tooling only; never place it in the wallet app or commit it.

The constructor takes the AUSD token address. The fee-free Monad testnet deployment and transaction receipt are recorded in `deployments/monad-testnet.json`. The wallet app is not yet wired to call the savings contract; that integration should batch token approval and pocket calls through the Mera-owned smart account.
