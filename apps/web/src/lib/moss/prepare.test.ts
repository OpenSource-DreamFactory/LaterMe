import assert from "node:assert/strict";
import test from "node:test";
import type { Plan } from "@themoss/core";
import { SimulatorUnavailableError } from "@themoss/simulator";

import { prepareMossTransaction } from "./prepare.ts";

const samplePlan = {
  kind: "plan",
  protocol: "laterme",
  method: "createPact",
  verb: "supply",
  chainId: 10143,
  account: "0xcccccccccccccccccccccccccccccccccccccccc",
  intent: "Create a LaterMe meal pact locking 0.001 MON",
  declaredRisk: ["fundOut"],
  expects: { out: [{ token: "native", amountMax: "1000000000000000" }] },
  confirms: ["pactCreated"],
  txs: [
    {
      from: "0xcccccccccccccccccccccccccccccccccccccccc",
      to: "0xC187dC6b75DA1255cF9bEb52d8e9585A7e483315",
      data: "0x1234",
      value: "0x38d7ea4c68000",
    },
  ],
  planHash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
} as Plan;

test("prepares a Moss transaction from the first plan tx", async () => {
  const prepared = await prepareMossTransaction(samplePlan, {
    simulate: false,
  });

  assert.equal(prepared.path, "moss");
  assert.equal(prepared.tx.to, samplePlan.txs[0]?.to);
  assert.equal(prepared.tx.data, "0x1234");
  assert.equal(prepared.tx.value, 0x38d7ea4c68000n);
  assert.match(prepared.summary, /Create a LaterMe meal pact/);
});

test("blocks signing when simulation reverts", async () => {
  await assert.rejects(
    () =>
      prepareMossTransaction(samplePlan, {
        simulator: {
          async simulate() {
            return {
              results: [
                {
                  protocol: "laterme",
                  method: "createPact",
                  intent: samplePlan.intent,
                  planHash: samplePlan.planHash,
                  planHashValid: true,
                  reverted: true,
                  revertReason: "InvalidDuration",
                  effects: {
                    assetsOut: [],
                    assetsIn: [],
                    approvals: [],
                    nftApprovals: [],
                    nftsOut: [],
                    nftsIn: [],
                    recipients: [],
                  },
                  observations: [],
                  warnings: [],
                  gasPerTx: ["21000"],
                },
              ],
            };
          },
        },
      }),
    /InvalidDuration|reverted/,
  );
});

test("continues when debug_traceCall is unavailable", async () => {
  const prepared = await prepareMossTransaction(samplePlan, {
    simulator: {
      async simulate() {
        throw new SimulatorUnavailableError("https://example.invalid");
      },
    },
  });

  assert.equal(prepared.path, "moss");
  assert.match(prepared.simulationSkippedReason ?? "", /debug_traceCall/);
});
