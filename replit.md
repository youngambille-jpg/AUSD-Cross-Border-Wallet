
Monad Foundation

Mera: One Passkey, Many Keys
Most creative non-wallet use of Mera's PRF-derived key material.

Prize
$2,500 USD

$2,500 USD — single prize

Track
All tracks

Deadline
Oct 14, 2026 at 04:59 GMT+1

Project selection
Create a project before choosing tracks and bounties.

About
What this bounty is for
Mera's PRF output is deterministic key material, and every salt is an isolated namespace — one passkey can mint unlimited unrelated keys for encryption, identities, or capabilities, all reconstructible from the passkey alone, with zero secrets stored anywhere. This bounty is for the most creative use of that primitive for anything that is NOT signing blockchain transactions from a wallet account.

Judging criteria
What judges look for
Novelty — the further from "passkey wallet," the better

Correct use of the primitives — encryption vs. derivation used appropriately, salts genuinely namespaced, nothing sensitive persisted to disk or server

The cross-device test — same passkey on a second device or fresh browser profile reproduces the same derived keys / decrypts the same state, live

Deliverables
What to have ready
A submission (may include a wallet, but the wallet can't be the point) where at least one PRF namespace does non-account work, demonstrated live

Asked for at submission
Describe how your project meaningfully utilizes Mera in non-account work.

Submit an optional demo video (up to 2 mins) showing how Mera is used where at least one PRF namespace does non-account work

Suggested starting points
Ideas that leave room for your own angle
01
Encrypted app state or E2E messaging with per-conversation derived keys

02
AI agent memory encrypted to the user's passkey — the agent's context survives any device, readable by no one else

03
Per-agent or per-app isolated identities minted from salt namespaces

04
Unlinkable per-context privacy identities

05
SSH or developer identities derived from a passkey

06
Secret vaults that wrap existing credentials (recovery phrases, API keys) under a passkey

Relevant resources
Start with the official path.
mera.category.xyz/concepts/passkeys-and-prf/
mera.category.xyz
(opens in a new tab)
mera.category.xyz/concepts/secret-vaults/
mera.category.xyz
(opens in a new tab)
mera.category.xyz/recipes/use-an-existing-secret/
mera.category.xyz
(opens in a new tab)
mera.category.xyz/reference/
mera.category.xyz
(opens in a new tab)
Build on Monad
docs.monad.xyz
(opens in a new tab)
Monad developer portal
developers.monad.xyz