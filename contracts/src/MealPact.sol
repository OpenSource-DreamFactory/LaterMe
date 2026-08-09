// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MealPact {
    enum Status {
        NONE,
        ACTIVE,
        COMPLETED,
        CANCELLED,
        EXPIRED
    }

    struct Pact {
        address owner;
        uint64 deadline;
        uint96 amount;
        bytes32 proposalHash;
        bytes32 completionHash;
        Status status;
    }

    error InvalidDuration(uint64 durationSeconds);
    error ZeroAmount();
    error AmountTooLarge(uint256 amount);
    error DeadlineOverflow();
    error PactNotFound(uint256 pactId);
    error NotPactOwner(uint256 pactId, address caller);
    error PactNotActive(uint256 pactId, Status status);
    error PactDeadlinePassed(uint256 pactId, uint64 deadline);
    error PactDeadlineNotReached(uint256 pactId, uint64 deadline);
    error RefundFailed(uint256 pactId, address recipient, uint256 amount);
    error ReentrantCall();

    event PactCreated(
        uint256 indexed pactId, address indexed owner, uint64 deadline, uint96 amount, bytes32 proposalHash
    );
    event PactCompleted(uint256 indexed pactId, address indexed owner, bytes32 completionHash, uint96 amount);
    event PactCancelled(uint256 indexed pactId, address indexed owner, uint96 amount);
    event PactExpired(uint256 indexed pactId, address indexed owner, uint96 amount);

    uint256 public nextPactId = 1;

    mapping(uint256 pactId => Pact pact) private _pacts;

    uint256 private _reentrancyStatus = 1;

    modifier nonReentrant() {
        if (_reentrancyStatus != 1) revert ReentrantCall();
        _reentrancyStatus = 2;
        _;
        _reentrancyStatus = 1;
    }

    function createPact(bytes32 proposalHash, uint64 durationSeconds)
        external
        payable
        nonReentrant
        returns (uint256 pactId)
    {
        if (!_isAllowedDuration(durationSeconds)) revert InvalidDuration(durationSeconds);
        if (msg.value == 0) revert ZeroAmount();
        if (msg.value > type(uint96).max) revert AmountTooLarge(msg.value);

        uint256 deadline = block.timestamp + uint256(durationSeconds);
        if (deadline > type(uint64).max) revert DeadlineOverflow();

        pactId = nextPactId++;
        _pacts[pactId] = Pact({
            owner: msg.sender,
            deadline: uint64(deadline),
            amount: uint96(msg.value),
            proposalHash: proposalHash,
            completionHash: bytes32(0),
            status: Status.ACTIVE
        });

        emit PactCreated(pactId, msg.sender, uint64(deadline), uint96(msg.value), proposalHash);
    }

    function completePact(uint256 pactId, bytes32 completionHash) external nonReentrant {
        Pact storage pact = _activePact(pactId);
        if (msg.sender != pact.owner) revert NotPactOwner(pactId, msg.sender);
        if (block.timestamp >= pact.deadline) {
            revert PactDeadlinePassed(pactId, pact.deadline);
        }

        pact.completionHash = completionHash;
        pact.status = Status.COMPLETED;

        _refund(pactId, pact);
        emit PactCompleted(pactId, pact.owner, completionHash, pact.amount);
    }

    function cancelPact(uint256 pactId) external nonReentrant {
        Pact storage pact = _activePact(pactId);
        if (msg.sender != pact.owner) revert NotPactOwner(pactId, msg.sender);

        pact.status = Status.CANCELLED;

        _refund(pactId, pact);
        emit PactCancelled(pactId, pact.owner, pact.amount);
    }

    function expirePact(uint256 pactId) external nonReentrant {
        Pact storage pact = _activePact(pactId);
        if (block.timestamp < pact.deadline) {
            revert PactDeadlineNotReached(pactId, pact.deadline);
        }

        pact.status = Status.EXPIRED;

        _refund(pactId, pact);
        emit PactExpired(pactId, pact.owner, pact.amount);
    }

    function getPact(uint256 pactId) external view returns (Pact memory) {
        Pact storage pact = _pacts[pactId];
        if (pact.owner == address(0)) revert PactNotFound(pactId);
        return pact;
    }

    function isAllowedDuration(uint64 durationSeconds) external pure returns (bool) {
        return _isAllowedDuration(durationSeconds);
    }

    function _activePact(uint256 pactId) private view returns (Pact storage pact) {
        pact = _pacts[pactId];
        if (pact.owner == address(0)) revert PactNotFound(pactId);
        if (pact.status != Status.ACTIVE) revert PactNotActive(pactId, pact.status);
    }

    function _refund(uint256 pactId, Pact storage pact) private {
        (bool success,) = payable(pact.owner).call{value: pact.amount}("");
        if (!success) revert RefundFailed(pactId, pact.owner, pact.amount);
    }

    function _isAllowedDuration(uint64 durationSeconds) private pure returns (bool) {
        return durationSeconds == 1;
    }
}
