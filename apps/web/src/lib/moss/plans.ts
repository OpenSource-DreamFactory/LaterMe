import type { Address, Plan } from "@themoss/core";
import { formatEther } from "viem";

import { getMossRegistry } from "./runtime.ts";

export const DEMO_PACT_AMOUNT = "0.001";

export type MossPlanKind =
  | "createPact"
  | "completePact"
  | "cancelPact"
  | "expirePact";

async function requirePlan(
  protocol: string,
  method: MossPlanKind,
  account: Address,
  params: Record<string, unknown>,
): Promise<Plan> {
  const result = await getMossRegistry().action(protocol, method, account, params);
  if (result.kind !== "plan") {
    throw new Error(`Expected Moss plan for ${method}, received ${result.kind}`);
  }
  return result;
}

export function buildCreatePactPlan(input: {
  account: Address;
  proposalHash: `0x${string}`;
  durationSeconds: number;
  amount?: string;
}) {
  return requirePlan("laterme", "createPact", input.account, {
    proposalHash: input.proposalHash,
    durationSeconds: String(input.durationSeconds),
    amount: input.amount ?? DEMO_PACT_AMOUNT,
  });
}

export function buildCompletePactPlan(input: {
  account: Address;
  pactId: bigint;
  completionHash: `0x${string}`;
  amountWei: bigint;
}) {
  return requirePlan("laterme", "completePact", input.account, {
    pactId: input.pactId.toString(),
    completionHash: input.completionHash,
    amount: formatEther(input.amountWei),
  });
}

export function buildCancelPactPlan(input: {
  account: Address;
  pactId: bigint;
  amountWei: bigint;
}) {
  return requirePlan("laterme", "cancelPact", input.account, {
    pactId: input.pactId.toString(),
    amount: formatEther(input.amountWei),
  });
}

export function buildExpirePactPlan(input: {
  account: Address;
  pactId: bigint;
  amountWei: bigint;
}) {
  return requirePlan("laterme", "expirePact", input.account, {
    pactId: input.pactId.toString(),
    amount: formatEther(input.amountWei),
  });
}
