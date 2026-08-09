import type { Address, Hex } from "viem";

export const pactStatusLabels = [
  "Unknown",
  "Active",
  "Completed",
  "Cancelled",
  "Expired",
] as const;

export type PactRecord = {
  id: bigint;
  owner: Address;
  deadline: bigint;
  amount: bigint;
  proposalHash: Hex;
  completionHash: Hex;
  status: number;
  transactionHash: Hex;
  blockNumber: bigint;
};

export function createBlockRanges(
  fromBlock: bigint,
  toBlock: bigint,
  rangeSize = 900n,
) {
  if (toBlock < fromBlock || rangeSize < 1n) return [];

  const ranges: Array<{ fromBlock: bigint; toBlock: bigint }> = [];
  let rangeStart = fromBlock;

  while (rangeStart <= toBlock) {
    const rangeEnd =
      rangeStart + rangeSize - 1n < toBlock
        ? rangeStart + rangeSize - 1n
        : toBlock;
    ranges.push({ fromBlock: rangeStart, toBlock: rangeEnd });
    rangeStart = rangeEnd + 1n;
  }

  return ranges;
}

export function parsePactId(value: string | undefined) {
  if (!value || !/^[1-9]\d*$/.test(value)) return null;
  return BigInt(value);
}

export function getPactDisplayStatus(
  status: number,
  deadline: bigint,
  nowSeconds: bigint,
) {
  if (status === 1 && nowSeconds >= deadline) return "Ready to expire";
  return pactStatusLabels[status] ?? pactStatusLabels[0];
}

export function getPactStatusClass(status: number, deadline: bigint, nowSeconds: bigint) {
  if (status === 1 && nowSeconds >= deadline) return "expirable";
  return pactStatusLabels[status]?.toLowerCase() ?? "unknown";
}
