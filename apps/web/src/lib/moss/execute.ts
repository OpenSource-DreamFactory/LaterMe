import type { Address, Plan } from "@themoss/core";
import type { Hex } from "viem";

import {
  type PreparedMossTx,
  prepareMossTransaction,
  type ExecutionPath,
} from "./prepare.ts";

export type DualPathResult = {
  path: ExecutionPath;
  hash: Hex;
  summary?: string;
  simulationSkippedReason?: string;
};

export type SendTxInput = {
  to: Address;
  data: Hex;
  value?: bigint;
  chainId: number;
};

export async function executeWithMossFallback(input: {
  buildPlan: () => Promise<Plan>;
  sendMossTx: (tx: SendTxInput) => Promise<Hex>;
  sendViemFallback: () => Promise<Hex>;
  chainId: number;
  prepare?: typeof prepareMossTransaction;
}): Promise<DualPathResult> {
  const prepare = input.prepare ?? prepareMossTransaction;

  try {
    const plan = await input.buildPlan();
    const prepared: PreparedMossTx = await prepare(plan);
    const hash = await input.sendMossTx({
      to: prepared.tx.to,
      data: prepared.tx.data,
      value: prepared.tx.value,
      chainId: input.chainId,
    });
    return {
      path: "moss",
      hash,
      summary: prepared.summary,
      simulationSkippedReason: prepared.simulationSkippedReason,
    };
  } catch {
    const hash = await input.sendViemFallback();
    return {
      path: "viem",
      hash,
      summary: "Signed through the direct wallet path after Moss preparation failed.",
    };
  }
}
