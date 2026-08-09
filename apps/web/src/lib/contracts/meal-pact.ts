import { isAddress, type Address } from "viem";

export const mealPactAbi = [
  {
    type: "function",
    name: "createPact",
    stateMutability: "payable",
    inputs: [
      { name: "proposalHash", type: "bytes32" },
      { name: "durationSeconds", type: "uint64" },
    ],
    outputs: [{ name: "pactId", type: "uint256" }],
  },
  {
    type: "function",
    name: "completePact",
    stateMutability: "nonpayable",
    inputs: [
      { name: "pactId", type: "uint256" },
      { name: "completionHash", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "cancelPact",
    stateMutability: "nonpayable",
    inputs: [{ name: "pactId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "expirePact",
    stateMutability: "nonpayable",
    inputs: [{ name: "pactId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "getPact",
    stateMutability: "view",
    inputs: [{ name: "pactId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "owner", type: "address" },
          { name: "deadline", type: "uint64" },
          { name: "amount", type: "uint96" },
          { name: "proposalHash", type: "bytes32" },
          { name: "completionHash", type: "bytes32" },
          { name: "status", type: "uint8" },
        ],
      },
    ],
  },
  {
    type: "event",
    name: "PactCreated",
    anonymous: false,
    inputs: [
      { name: "pactId", type: "uint256", indexed: true },
      { name: "owner", type: "address", indexed: true },
      { name: "deadline", type: "uint64", indexed: false },
      { name: "amount", type: "uint96", indexed: false },
      { name: "proposalHash", type: "bytes32", indexed: false },
    ],
  },
  {
    type: "event",
    name: "PactCompleted",
    anonymous: false,
    inputs: [
      { name: "pactId", type: "uint256", indexed: true },
      { name: "owner", type: "address", indexed: true },
      { name: "completionHash", type: "bytes32", indexed: false },
      { name: "amount", type: "uint96", indexed: false },
    ],
  },
  {
    type: "event",
    name: "PactCancelled",
    anonymous: false,
    inputs: [
      { name: "pactId", type: "uint256", indexed: true },
      { name: "owner", type: "address", indexed: true },
      { name: "amount", type: "uint96", indexed: false },
    ],
  },
  {
    type: "event",
    name: "PactExpired",
    anonymous: false,
    inputs: [
      { name: "pactId", type: "uint256", indexed: true },
      { name: "owner", type: "address", indexed: true },
      { name: "amount", type: "uint96", indexed: false },
    ],
  },
] as const;

const configuredAddress =
  process.env.NEXT_PUBLIC_MEAL_PACT_ADDRESS ??
  "0xC187dC6b75DA1255cF9bEb52d8e9585A7e483315";

export const mealPactAddress: Address | undefined =
  configuredAddress && isAddress(configuredAddress)
    ? configuredAddress
    : undefined;

export const mealPactDeploymentBlock = 52_095_976n;
