// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {MealPact} from "../src/MealPact.sol";

contract MealPactTest is Test {
    event PactCreated(
        uint256 indexed pactId, address indexed owner, uint64 deadline, uint96 amount, bytes32 proposalHash
    );
    event PactCompleted(uint256 indexed pactId, address indexed owner, bytes32 completionHash, uint96 amount);
    event PactCancelled(uint256 indexed pactId, address indexed owner, uint96 amount);
    event PactExpired(uint256 indexed pactId, address indexed owner, uint96 amount);

    MealPact private mealPact;

    address private owner = makeAddr("owner");
    address private stranger = makeAddr("stranger");

    uint96 private constant AMOUNT = 0.001 ether;
    bytes32 private constant PROPOSAL_HASH = keccak256("later-me-proposal");
    bytes32 private constant COMPLETION_HASH = keccak256("completion-proof");

    function setUp() external {
        mealPact = new MealPact();
        vm.deal(owner, 10 ether);
    }

    function testCreatePactStoresFundsAndData() external {
        uint64 expectedDeadline = uint64(block.timestamp + 1 seconds);

        vm.expectEmit(true, true, false, true);
        emit PactCreated(1, owner, expectedDeadline, AMOUNT, PROPOSAL_HASH);

        vm.prank(owner);
        uint256 pactId = mealPact.createPact{value: AMOUNT}(PROPOSAL_HASH, 1);

        MealPact.Pact memory pact = mealPact.getPact(pactId);
        assertEq(pactId, 1);
        assertEq(pact.owner, owner);
        assertEq(pact.deadline, expectedDeadline);
        assertEq(pact.amount, AMOUNT);
        assertEq(pact.proposalHash, PROPOSAL_HASH);
        assertEq(pact.completionHash, bytes32(0));
        assertEq(uint256(pact.status), uint256(MealPact.Status.ACTIVE));
        assertEq(address(mealPact).balance, AMOUNT);
        assertEq(mealPact.nextPactId(), 2);
    }

    function testAllowedDurations() external view {
        assertTrue(mealPact.isAllowedDuration(1));
        assertFalse(mealPact.isAllowedDuration(0));
        assertFalse(mealPact.isAllowedDuration(10));
        assertFalse(mealPact.isAllowedDuration(25));
    }

    function testCreateRejectsInvalidDuration() external {
        vm.expectRevert(abi.encodeWithSelector(MealPact.InvalidDuration.selector, 25));
        vm.prank(owner);
        mealPact.createPact{value: AMOUNT}(PROPOSAL_HASH, 25);
    }

    function testCreateRejectsZeroAmount() external {
        vm.expectRevert(MealPact.ZeroAmount.selector);
        vm.prank(owner);
        mealPact.createPact(PROPOSAL_HASH, 1);
    }

    function testCreateRejectsAmountAboveUint96() external {
        uint256 oversizedAmount = uint256(type(uint96).max) + 1;
        vm.deal(owner, oversizedAmount);

        vm.expectRevert(abi.encodeWithSelector(MealPact.AmountTooLarge.selector, oversizedAmount));
        vm.prank(owner);
        mealPact.createPact{value: oversizedAmount}(PROPOSAL_HASH, 1);
    }

    function testCreateRejectsDeadlineOverflow() external {
        vm.warp(type(uint64).max);

        vm.expectRevert(MealPact.DeadlineOverflow.selector);
        vm.prank(owner);
        mealPact.createPact{value: AMOUNT}(PROPOSAL_HASH, 1);
    }

    function testGetPactRejectsUnknownId() external {
        vm.expectRevert(abi.encodeWithSelector(MealPact.PactNotFound.selector, 99));
        mealPact.getPact(99);
    }

    function testOwnerCompletesBeforeDeadlineAndReceivesRefund() external {
        uint256 pactId = _createPact(1);
        uint256 balanceBeforeCompletion = owner.balance;

        vm.expectEmit(true, true, false, true);
        emit PactCompleted(pactId, owner, COMPLETION_HASH, AMOUNT);

        vm.prank(owner);
        mealPact.completePact(pactId, COMPLETION_HASH);

        MealPact.Pact memory pact = mealPact.getPact(pactId);
        assertEq(pact.completionHash, COMPLETION_HASH);
        assertEq(uint256(pact.status), uint256(MealPact.Status.COMPLETED));
        assertEq(owner.balance, balanceBeforeCompletion + AMOUNT);
        assertEq(address(mealPact).balance, 0);
    }

    function testOnlyOwnerCanComplete() external {
        uint256 pactId = _createPact(1);

        vm.expectRevert(abi.encodeWithSelector(MealPact.NotPactOwner.selector, pactId, stranger));
        vm.prank(stranger);
        mealPact.completePact(pactId, COMPLETION_HASH);
    }

    function testCannotCompleteAtDeadline() external {
        uint256 pactId = _createPact(1);
        MealPact.Pact memory pact = mealPact.getPact(pactId);
        vm.warp(pact.deadline);

        vm.expectRevert(abi.encodeWithSelector(MealPact.PactDeadlinePassed.selector, pactId, pact.deadline));
        vm.prank(owner);
        mealPact.completePact(pactId, COMPLETION_HASH);
    }

    function testCannotSettlePactTwice() external {
        uint256 pactId = _createPact(1);

        vm.prank(owner);
        mealPact.completePact(pactId, COMPLETION_HASH);

        vm.expectRevert(abi.encodeWithSelector(MealPact.PactNotActive.selector, pactId, MealPact.Status.COMPLETED));
        vm.prank(owner);
        mealPact.cancelPact(pactId);
    }

    function testOwnerCancelsAndReceivesRefund() external {
        uint256 pactId = _createPact(1);
        uint256 balanceBeforeCancellation = owner.balance;

        vm.expectEmit(true, true, false, true);
        emit PactCancelled(pactId, owner, AMOUNT);

        vm.prank(owner);
        mealPact.cancelPact(pactId);

        MealPact.Pact memory pact = mealPact.getPact(pactId);
        assertEq(uint256(pact.status), uint256(MealPact.Status.CANCELLED));
        assertEq(owner.balance, balanceBeforeCancellation + AMOUNT);
        assertEq(address(mealPact).balance, 0);
    }

    function testOnlyOwnerCanCancel() external {
        uint256 pactId = _createPact(1);

        vm.expectRevert(abi.encodeWithSelector(MealPact.NotPactOwner.selector, pactId, stranger));
        vm.prank(stranger);
        mealPact.cancelPact(pactId);
    }

    function testAnyoneCanExpireAtDeadlineAndOwnerReceivesRefund() external {
        uint256 pactId = _createPact(1);
        MealPact.Pact memory pactBeforeExpiry = mealPact.getPact(pactId);
        uint256 ownerBalanceBeforeExpiry = owner.balance;
        vm.warp(pactBeforeExpiry.deadline);

        vm.expectEmit(true, true, false, true);
        emit PactExpired(pactId, owner, AMOUNT);

        vm.prank(stranger);
        mealPact.expirePact(pactId);

        MealPact.Pact memory pactAfterExpiry = mealPact.getPact(pactId);
        assertEq(uint256(pactAfterExpiry.status), uint256(MealPact.Status.EXPIRED));
        assertEq(owner.balance, ownerBalanceBeforeExpiry + AMOUNT);
        assertEq(address(mealPact).balance, 0);
    }

    function testCannotExpireBeforeDeadline() external {
        uint256 pactId = _createPact(1);
        MealPact.Pact memory pact = mealPact.getPact(pactId);

        vm.expectRevert(abi.encodeWithSelector(MealPact.PactDeadlineNotReached.selector, pactId, pact.deadline));
        mealPact.expirePact(pactId);
    }

    function testRefundFailureRevertsStateTransition() external {
        RejectingOwner rejectingOwner = new RejectingOwner(mealPact);
        uint256 pactId = rejectingOwner.create{value: AMOUNT}(PROPOSAL_HASH);

        vm.expectRevert(abi.encodeWithSelector(MealPact.RefundFailed.selector, pactId, address(rejectingOwner), AMOUNT));
        rejectingOwner.complete(COMPLETION_HASH);

        MealPact.Pact memory pact = mealPact.getPact(pactId);
        assertEq(uint256(pact.status), uint256(MealPact.Status.ACTIVE));
        assertEq(pact.completionHash, bytes32(0));
        assertEq(address(mealPact).balance, AMOUNT);
    }

    function testRefundCannotReenterSettlement() external {
        ReentrantOwner reentrantOwner = new ReentrantOwner(mealPact);
        uint256 pactId = reentrantOwner.create{value: AMOUNT}(PROPOSAL_HASH);

        reentrantOwner.complete(COMPLETION_HASH);

        MealPact.Pact memory pact = mealPact.getPact(pactId);
        assertTrue(reentrantOwner.reentryBlocked());
        assertEq(uint256(pact.status), uint256(MealPact.Status.COMPLETED));
        assertEq(address(reentrantOwner).balance, AMOUNT);
        assertEq(address(mealPact).balance, 0);
    }

    function _createPact(uint64 durationSeconds) private returns (uint256) {
        vm.prank(owner);
        return mealPact.createPact{value: AMOUNT}(PROPOSAL_HASH, durationSeconds);
    }
}

contract RejectingOwner {
    MealPact private immutable _mealPact;
    uint256 private _pactId;

    constructor(MealPact mealPact_) {
        _mealPact = mealPact_;
    }

    receive() external payable {
        revert("refund rejected");
    }

    function create(bytes32 proposalHash) external payable returns (uint256) {
        _pactId = _mealPact.createPact{value: msg.value}(proposalHash, 1);
        return _pactId;
    }

    function complete(bytes32 completionHash) external {
        _mealPact.completePact(_pactId, completionHash);
    }
}

contract ReentrantOwner {
    MealPact private immutable _mealPact;

    uint256 private _pactId;
    bool public reentryBlocked;

    constructor(MealPact mealPact_) {
        _mealPact = mealPact_;
    }

    receive() external payable {
        (bool success,) = address(_mealPact).call(abi.encodeCall(MealPact.cancelPact, (_pactId)));
        reentryBlocked = !success;
    }

    function create(bytes32 proposalHash) external payable returns (uint256) {
        _pactId = _mealPact.createPact{value: msg.value}(proposalHash, 1);
        return _pactId;
    }

    function complete(bytes32 completionHash) external {
        _mealPact.completePact(_pactId, completionHash);
    }
}
