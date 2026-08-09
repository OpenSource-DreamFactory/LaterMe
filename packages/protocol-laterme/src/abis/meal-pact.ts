/**
 * ABI origin: compiled (ADR 0007)
 * Generated from committed contract source:
 *   contracts/src/MealPact.sol
 * Deployment metadata:
 *   contracts/deployments/10143.json
 */
import { parseAbi } from "viem";

export const MealPactAbi = parseAbi([
  "function createPact(bytes32 proposalHash, uint64 durationSeconds) payable returns (uint256 pactId)",
  "function completePact(uint256 pactId, bytes32 completionHash)",
  "function cancelPact(uint256 pactId)",
  "function expirePact(uint256 pactId)",
  "function getPact(uint256 pactId) view returns ((address owner, uint64 deadline, uint96 amount, bytes32 proposalHash, bytes32 completionHash, uint8 status))",
  "function isAllowedDuration(uint64 durationSeconds) view returns (bool)",
  "event PactCreated(uint256 indexed pactId, address indexed owner, uint64 deadline, uint96 amount, bytes32 proposalHash)",
  "event PactCompleted(uint256 indexed pactId, address indexed owner, bytes32 completionHash, uint96 amount)",
  "event PactCancelled(uint256 indexed pactId, address indexed owner, uint96 amount)",
  "event PactExpired(uint256 indexed pactId, address indexed owner, uint96 amount)",
]);
