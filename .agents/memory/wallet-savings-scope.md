---
name: Wallet tabs and Savings scope
description: User-stated direction for the AUSD Wallet navigation and peer savings features.
---

The wallet needs a primary Savings tab where users can view their own pockets, gift other users, fund another user's pocket, and track that person's pocket. Usernames map to wallet addresses locally. Yield and Settings are later-phase tabs.

The deployed contract supports gifts to a recipient's unallocated gift balance and direct gifts into an existing pocket using its owner address and pocket ID. The app should make the distinction clear. Shared-pocket tracking should use explicitly shared owner/pocket details and remain local to the user's wallet unless the user changes that design.

**Why:** the user described the intended wallet tabs and Savings features on 2026-10-09.

**How to apply:** keep the Savings tab focused on the user's own pockets, contact-based gifts, and explicitly shared pockets. Leave Yield and Settings for later work.
