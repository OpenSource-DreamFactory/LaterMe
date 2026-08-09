import assert from "node:assert/strict";
import test from "node:test";
import type { Plan } from "@themoss/core";

import { executeWithMossFallback } from "./execute.ts";

const plan = {
  kind: "plan",
  protocol: "laterme",
  method: "createPact",
  verb: "supply",
  chainId: 10143,
  account: "0xcccccccccccccccccccccccccccccccccccccccc",
  intent: "Create pact",
  declaredRisk: ["fundOut"],
  expects: {},
  confirms: ["pactCreated"],
  txs: [
    {
      from: "0xcccccccccccccccccccccccccccccccccccccccc",
      to: "0xC187dC6b75DA1255cF9bEb52d8e9585A7e483315",
      data: "0xabcd",
      value: "0x1",
    },
  ],
  planHash: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
} as Plan;

test("uses the Moss path when plan preparation succeeds", async () => {
  const result = await executeWithMossFallback({
    chainId: 10143,
    buildPlan: async () => plan,
    prepare: async (current) => ({
      path: "moss",
      plan: current,
      tx: {
        to: current.txs[0]!.to,
        data: current.txs[0]!.data,
        value: 1n,
      },
      summary: "Moss summary",
    }),
    sendMossTx: async () => "0xmoss",
    sendViemFallback: async () => "0xviem",
  });

  assert.equal(result.path, "moss");
  assert.equal(result.hash, "0xmoss");
  assert.equal(result.summary, "Moss summary");
});

test("falls back to viem when Moss preparation fails", async () => {
  const result = await executeWithMossFallback({
    chainId: 10143,
    buildPlan: async () => {
      throw new Error("registry unavailable");
    },
    sendMossTx: async () => "0xmoss",
    sendViemFallback: async () => "0xviem",
  });

  assert.equal(result.path, "viem");
  assert.equal(result.hash, "0xviem");
});
