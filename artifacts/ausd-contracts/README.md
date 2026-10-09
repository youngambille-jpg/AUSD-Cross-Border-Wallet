# AUSD savings pockets

Hardhat project for the Monad testnet savings pocket contract.

## Product and Mera model
codex resume 01a11fa2-3c6c-7f40-8c72-bf86d6ac7c6f
The Mera passkey derives the user's signing authority. The existing Kernel smart account is the on-chain owner and caller; it signs UserOperations that call this contract. A pocket is an ID in the contract's ledger, not a second private key or a separately derived wallet. That keeps one passkey as the account layer and avoids persisting new key material.

`payWithAutoSave` treats the amount entered by the user as the amount the recipient receives. It adds the configured percentage on top, moving that extra AUSD into the selected pocket in the same transaction. The review UI should show recipient amount, saved amount, and total debit before confirmation. The smart account must approve this contract for the total debit; the wallet should batch approval and the contract call in one sponsored UserOperation where supported.

Any smart account can `gift` AUSD into an existing pocket belonging to another smart account. Only that pocket's owner can withdraw it. The contract holds funds directly and has no admin withdrawal path. It does not integrate a yield strategy; a future yield tab should use a separately reviewed adapter/vault flow and make protocol risks and withdrawal availability explicit.

## Commands and configuration

- `pnpm --filter @workspace/ausd-contracts compile`
- Monad testnet is chain ID `10143`.
- `MONAD_TESTNET_RPC_URL` optionally overrides the public testnet RPC.
- `DEPLOYER_PRIVATE_KEY` is for deployment tooling only; never place it in the wallet app or commit it.

The constructor takes the AUSD token address, so confirm the deployment address and token behavior on the target network before deployment. This first scaffold has no deploy script, deployment, or app integration yet.
