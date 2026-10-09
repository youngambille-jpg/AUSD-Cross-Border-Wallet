// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../contracts/SavingsPockets.sol";

contract MockAUSD {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address account, uint256 amount) external {
        balanceOf[account] += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address recipient, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[recipient] += amount;
        return true;
    }

    function transferFrom(address owner, address recipient, uint256 amount) external returns (bool) {
        require(balanceOf[owner] >= amount, "balance");
        require(allowance[owner][msg.sender] >= amount, "allowance");
        allowance[owner][msg.sender] -= amount;
        balanceOf[owner] -= amount;
        balanceOf[recipient] += amount;
        return true;
    }
}

/** Test actor simulates each user's smart account as the contract caller. */
contract PocketAccountActor {
    function approve(MockAUSD token, address spender, uint256 amount) external {
        require(token.approve(spender, amount), "approve failed");
    }

    function createPocket(SavingsPockets vault, bytes32 pocketId, uint16 rate) external {
        vault.createPocket(pocketId, rate);
    }

    function pay(SavingsPockets vault, bytes32 pocketId, address recipient, uint256 amount) external {
        vault.payWithAutoSave(pocketId, recipient, amount);
    }

    function giftPerson(SavingsPockets vault, address recipient, uint256 amount) external {
        vault.giftToPerson(recipient, amount);
    }

    function giftGoal(SavingsPockets vault, address recipient, bytes32 pocketId, uint256 amount) external {
        vault.gift(recipient, pocketId, amount);
    }

    function allocateGift(SavingsPockets vault, bytes32 pocketId, uint256 amount) external {
        vault.allocateGiftToPocket(pocketId, amount);
    }

    function withdrawGift(SavingsPockets vault, uint256 amount) external {
        vault.withdrawGift(amount, address(this));
    }

    function withdrawPocket(SavingsPockets vault, bytes32 pocketId, uint256 amount) external {
        vault.withdraw(pocketId, amount, address(this));
    }
}

contract SavingsPocketsIntegrationTest {
    function testPaymentSavesPercentageAtomicallyAndOwnerWithdraws() external {
        MockAUSD token = new MockAUSD();
        SavingsPockets vault = new SavingsPockets(address(token));
        PocketAccountActor payer = new PocketAccountActor();
        PocketAccountActor recipient = new PocketAccountActor();
        bytes32 goal = keccak256("weekend-trip");

        token.mint(address(payer), 1_000);
        payer.approve(token, address(vault), 1_000);
        payer.createPocket(vault, goal, 1_000); // 10%
        payer.pay(vault, goal, address(recipient), 200);

        (uint256 saved, uint16 rate, bool exists) = vault.getPocket(address(payer), goal);
        require(exists && rate == 1_000 && saved == 20, "auto-save accounting");
        require(token.balanceOf(address(recipient)) == 200, "recipient payment");
        require(token.balanceOf(address(vault)) == 20, "vault received savings");
        require(token.balanceOf(address(payer)) == 780, "total debit");

        payer.withdrawPocket(vault, goal, 20);
        (saved,,) = vault.getPocket(address(payer), goal);
        require(saved == 0 && token.balanceOf(address(payer)) == 800, "owner withdrawal");
    }

    function testPersonGiftCanBeClaimedWithoutGoalThenAllocatedOrWithdrawn() external {
        MockAUSD token = new MockAUSD();
        SavingsPockets vault = new SavingsPockets(address(token));
        PocketAccountActor donor = new PocketAccountActor();
        PocketAccountActor recipient = new PocketAccountActor();
        bytes32 goal = keccak256("concert");

        token.mint(address(donor), 500);
        donor.approve(token, address(vault), 500);
        donor.giftPerson(vault, address(recipient), 500);
        require(vault.unallocatedGiftBalance(address(recipient)) == 500, "person gift credit");

        recipient.createPocket(vault, goal, 0);
        recipient.allocateGift(vault, goal, 300);
        recipient.withdrawGift(vault, 200);
        (uint256 saved,, bool exists) = vault.getPocket(address(recipient), goal);
        require(exists && saved == 300, "gift allocated to recipient goal");
        require(vault.unallocatedGiftBalance(address(recipient)) == 0, "unallocated gift cleared");
        require(token.balanceOf(address(recipient)) == 200, "recipient withdrew remainder");
    }

    function testGiftCanFundAnotherAccountsExistingGoal() external {
        MockAUSD token = new MockAUSD();
        SavingsPockets vault = new SavingsPockets(address(token));
        PocketAccountActor donor = new PocketAccountActor();
        PocketAccountActor goalOwner = new PocketAccountActor();
        bytes32 goal = keccak256("new-home");

        token.mint(address(donor), 250);
        donor.approve(token, address(vault), 250);
        goalOwner.createPocket(vault, goal, 0);
        donor.giftGoal(vault, address(goalOwner), goal, 250);
        (uint256 saved,,) = vault.getPocket(address(goalOwner), goal);
        require(saved == 250, "gift credited to goal");

        goalOwner.withdrawPocket(vault, goal, 250);
        (saved,,) = vault.getPocket(address(goalOwner), goal);
        require(saved == 0 && token.balanceOf(address(goalOwner)) == 250, "goal owner controls funds");
    }
}
