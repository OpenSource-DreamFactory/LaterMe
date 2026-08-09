import type { Address, Plan } from "@themoss/core";
import type { PlanSimResult, SimulateOutcome } from "@themoss/simulator";
import { SimulatorUnavailableError } from "@themoss/simulator";
import type { Hex } from "viem";

import { getMossSimulator } from "./runtime.ts";

export type ExecutionPath = "moss" | "viem";

export type PreparedMossTx = {
  path: "moss";
  plan: Plan;
  simulation?: PlanSimResult;
  simulationSkippedReason?: string;
  tx: {
    to: Address;
    data: Hex;
    value: bigint;
  };
  summary: string;
};

function summarizePlan(plan: Plan, simulation?: PlanSimResult): string {
  return simulation?.observations[0]?.intent ?? plan.intent;
}

function assertSafeToSign(simulation: PlanSimResult) {
  if (!simulation.planHashValid) {
    throw new Error("Moss plan hash mismatch; refusing to sign.");
  }
  if (simulation.reverted) {
    throw new Error(
      simulation.revertReason || "Moss simulation reverted; refusing to sign.",
    );
  }
  const blocking = simulation.warnings.filter((warning) =>
    ["REVERTED", "PLAN_TAMPERED", "OUTFLOW_EXCEEDS_MAX"].includes(warning.code),
  );
  if (blocking.length > 0) {
    throw new Error(blocking.map((warning) => warning.message).join(" "));
  }
}

export async function prepareMossTransaction(
  plan: Plan,
  options: {
    simulate?: boolean;
    simulator?: {
      simulate: (plans: Plan[]) => Promise<SimulateOutcome>;
    };
  } = {},
): Promise<PreparedMossTx> {
  const firstTx = plan.txs[0];
  if (!firstTx) {
    throw new Error("Moss plan did not include a transaction.");
  }

  let simulation: PlanSimResult | undefined;
  let simulationSkippedReason: string | undefined;

  if (options.simulate !== false) {
    try {
      const simulator = options.simulator ?? getMossSimulator();
      const outcome = await simulator.simulate([plan]);
      if (outcome.halted) {
        throw new Error(
          outcome.halted.reason || "Moss simulation halted before completion.",
        );
      }
      simulation = outcome.results[0];
      if (!simulation) {
        throw new Error("Moss simulation returned no results.");
      }
      assertSafeToSign(simulation);
    } catch (error) {
      if (error instanceof SimulatorUnavailableError) {
        simulationSkippedReason =
          "RPC does not expose debug_traceCall; signing the Moss plan without live simulation.";
      } else {
        throw error;
      }
    }
  } else {
    simulationSkippedReason = "Simulation disabled for this call.";
  }

  return {
    path: "moss",
    plan,
    simulation,
    simulationSkippedReason,
    tx: {
      to: firstTx.to,
      data: firstTx.data,
      value: BigInt(firstTx.value),
    },
    summary: summarizePlan(plan, simulation),
  };
}
