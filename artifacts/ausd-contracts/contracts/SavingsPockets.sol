// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IERC20PocketToken {
    function transfer(address to, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

/**
 * @title SavingsPockets
 * @notice AUSD pockets controlled by the caller, intended to be a Mera-owned
 *         smart account. The contract does not know about or store passkeys.
 *
 * A payment with auto-save sends the requested payment amount to its recipient
 * and moves an additional percentage into one of the caller's pockets. The
 * caller's smart account must approve this contract for the total debit.
 */
contract SavingsPockets {
    uint16 public constant BPS_DENOMINATOR = 10_000;
    IERC20PocketToken public immutable token;

    struct Pocket {
        uint256 balance;
        uint16 autoSaveBps;
        bool exists;
    }

    mapping(address owner => mapping(bytes32 pocketId => Pocket)) private pockets;
    mapping(address recipient => uint256 balance) public unallocatedGiftBalance;
    bool private entered;

    error InvalidAddress();
    error InvalidAmount();
    error InvalidRate();
    error PocketAlreadyExists();
    error PocketNotFound();
    error InsufficientPocketBalance();
    error TokenTransferFailed();
    error ReentrantCall();

    event PocketCreated(address indexed owner, bytes32 indexed pocketId);
    event AutoSaveRateUpdated(address indexed owner, bytes32 indexed pocketId, uint16 bps);
    event Deposited(address indexed owner, bytes32 indexed pocketId, uint256 amount);
    event Withdrawn(address indexed owner, bytes32 indexed pocketId, address indexed recipient, uint256 amount);
    event PaymentSent(
        address indexed owner,
        bytes32 indexed pocketId,
        address indexed recipient,
        uint256 paymentAmount,
        uint256 savedAmount
    );
    event Gifted(
        address indexed donor,
        address indexed recipientOwner,
        bytes32 indexed pocketId,
        uint256 amount
    );
    event PersonGifted(address indexed donor, address indexed recipientOwner, uint256 amount);
    event GiftAllocated(address indexed recipientOwner, bytes32 indexed pocketId, uint256 amount);
    event GiftWithdrawn(address indexed recipientOwner, address indexed recipient, uint256 amount);

    constructor(address tokenAddress) {
        if (tokenAddress == address(0) || tokenAddress.code.length == 0) revert InvalidAddress();
        token = IERC20PocketToken(tokenAddress);
    }

    modifier nonReentrant() {
        if (entered) revert ReentrantCall();
        entered = true;
        _;
        entered = false;
    }

    function createPocket(bytes32 pocketId, uint16 autoSaveBps) external {
        if (pocketId == bytes32(0)) revert InvalidAmount();
        if (autoSaveBps > BPS_DENOMINATOR) revert InvalidRate();
        Pocket storage pocket = pockets[msg.sender][pocketId];
        if (pocket.exists) revert PocketAlreadyExists();
        pocket.exists = true;
        pocket.autoSaveBps = autoSaveBps;
        emit PocketCreated(msg.sender, pocketId);
        emit AutoSaveRateUpdated(msg.sender, pocketId, autoSaveBps);
    }

    function setAutoSaveRate(bytes32 pocketId, uint16 autoSaveBps) external {
        if (autoSaveBps > BPS_DENOMINATOR) revert InvalidRate();
        Pocket storage pocket = _pocket(msg.sender, pocketId);
        pocket.autoSaveBps = autoSaveBps;
        emit AutoSaveRateUpdated(msg.sender, pocketId, autoSaveBps);
    }

    function deposit(bytes32 pocketId, uint256 amount) external nonReentrant {
        if (amount == 0) revert InvalidAmount();
        Pocket storage pocket = _pocket(msg.sender, pocketId);
        _safeTransferFrom(msg.sender, address(this), amount);
        pocket.balance += amount;
        emit Deposited(msg.sender, pocketId, amount);
    }

    function withdraw(bytes32 pocketId, uint256 amount, address recipient) external nonReentrant {
        if (recipient == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();
        Pocket storage pocket = _pocket(msg.sender, pocketId);
        if (pocket.balance < amount) revert InsufficientPocketBalance();
        pocket.balance -= amount;
        _safeTransfer(recipient, amount);
        emit Withdrawn(msg.sender, pocketId, recipient, amount);
    }

    /**
     * @notice Send `paymentAmount` to a recipient and save an additional
     *         percentage of that amount into the selected pocket atomically.
     * @dev The caller must approve `paymentAmount + savedAmount` first. Setting
     *      the pocket rate to zero sends a normal payment with no auto-save.
     */
    function payWithAutoSave(bytes32 pocketId, address recipient, uint256 paymentAmount)
        external
        nonReentrant
        returns (uint256 savedAmount)
    {
        if (recipient == address(0)) revert InvalidAddress();
        if (recipient == address(this)) revert InvalidAddress();
        if (paymentAmount == 0) revert InvalidAmount();
        Pocket storage pocket = _pocket(msg.sender, pocketId);
        savedAmount = (paymentAmount * pocket.autoSaveBps) / BPS_DENOMINATOR;
        _safeTransferFrom(msg.sender, recipient, paymentAmount);
        if (savedAmount != 0) {
            _safeTransferFrom(msg.sender, address(this), savedAmount);
            pocket.balance += savedAmount;
        }
        emit PaymentSent(msg.sender, pocketId, recipient, paymentAmount, savedAmount);
    }

    /** @notice Gift AUSD into an existing pocket owned by another smart account. */
    function gift(address recipientOwner, bytes32 pocketId, uint256 amount) external nonReentrant {
        if (recipientOwner == address(0) || recipientOwner == msg.sender) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();
        Pocket storage recipientPocket = _pocket(recipientOwner, pocketId);
        _safeTransferFrom(msg.sender, address(this), amount);
        recipientPocket.balance += amount;
        emit Gifted(msg.sender, recipientOwner, pocketId, amount);
    }

    /** @notice Gift AUSD to a person without requiring them to have a pocket yet. */
    function giftToPerson(address recipientOwner, uint256 amount) external nonReentrant {
        if (recipientOwner == address(0) || recipientOwner == msg.sender) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();
        _safeTransferFrom(msg.sender, address(this), amount);
        unallocatedGiftBalance[recipientOwner] += amount;
        emit PersonGifted(msg.sender, recipientOwner, amount);
    }

    /** @notice Move a person's unallocated gifts into one of their own pockets. */
    function allocateGiftToPocket(bytes32 pocketId, uint256 amount) external {
        if (amount == 0) revert InvalidAmount();
        Pocket storage pocket = _pocket(msg.sender, pocketId);
        uint256 giftBalance = unallocatedGiftBalance[msg.sender];
        if (giftBalance < amount) revert InsufficientPocketBalance();
        unallocatedGiftBalance[msg.sender] = giftBalance - amount;
        pocket.balance += amount;
        emit GiftAllocated(msg.sender, pocketId, amount);
    }

    /** @notice Withdraw person-level gifts without first creating a savings pocket. */
    function withdrawGift(uint256 amount, address recipient) external nonReentrant {
        if (recipient == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();
        uint256 giftBalance = unallocatedGiftBalance[msg.sender];
        if (giftBalance < amount) revert InsufficientPocketBalance();
        unallocatedGiftBalance[msg.sender] = giftBalance - amount;
        _safeTransfer(recipient, amount);
        emit GiftWithdrawn(msg.sender, recipient, amount);
    }

    function getPocket(address owner, bytes32 pocketId)
        external
        view
        returns (uint256 balance, uint16 autoSaveBps, bool exists)
    {
        Pocket storage pocket = pockets[owner][pocketId];
        return (pocket.balance, pocket.autoSaveBps, pocket.exists);
    }

    function _pocket(address owner, bytes32 pocketId) private view returns (Pocket storage pocket) {
        pocket = pockets[owner][pocketId];
        if (!pocket.exists) revert PocketNotFound();
    }

    function _safeTransfer(address recipient, uint256 amount) private {
        (bool success, bytes memory result) = address(token).call(
            abi.encodeCall(IERC20PocketToken.transfer, (recipient, amount))
        );
        if (!success || (result.length != 0 && !abi.decode(result, (bool)))) revert TokenTransferFailed();
    }

    function _safeTransferFrom(address owner, address recipient, uint256 amount) private {
        (bool success, bytes memory result) = address(token).call(
            abi.encodeCall(IERC20PocketToken.transferFrom, (owner, recipient, amount))
        );
        if (!success || (result.length != 0 && !abi.decode(result, (bool)))) revert TokenTransferFailed();
    }
}
