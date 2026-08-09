import {
  type MossRuntime,
  Registry,
  createRuntime,
} from "@themoss/core";
import { encodeFunctionData, getAddress, parseEther } from "viem";
import { describe, expect, it } from "vitest";

import { MealPactAbi } from "../src/abis/meal-pact.js";
import {
  MEAL_PACT_ADDRESS,
  MEAL_PACT_CHAIN_ID,
} from "../src/addresses.js";
import { LaterMeProtocol, latermeManifest } from "../src/index.js";

const ACCOUNT = getAddress("0xcccccccccccccccccccccccccccccccccccccccc");
const PROPOSAL_HASH =
  "0x1111111111111111111111111111111111111111111111111111111111111111" as const;

function testRuntime(): MossRuntime {
  // Offline unit tests only encode calldata; RPC is unused for create/cancel plans.
  return createRuntime({
    rpcUrl: "http://127.0.0.1:8545",
    chainId: MEAL_PACT_CHAIN_ID,
  });
}

describe("@laterme/protocol-laterme", () => {
  it("registers through the package manifest and discovers pact capabilities", () => {
    const registry = new Registry(testRuntime());
    registry.use(latermeManifest);

    const coords = registry.discover({ protocol: "laterme" });
    const methods = coords.map((item) => item.method).sort();

    expect(methods).toEqual([
      "cancelPact",
      "completePact",
      "createPact",
      "expirePact",
      "getPact",
    ]);
  });

  it("builds an unsigned createPact plan with the demo amount and duration", async () => {
    const registry = new Registry(testRuntime());
    registry.register(LaterMeProtocol);

    const result = await registry.action("laterme", "createPact", ACCOUNT, {
      proposalHash: PROPOSAL_HASH,
      durationSeconds: "1",
      amount: "0.001",
    });

    expect(result.kind).toBe("plan");
    if (result.kind !== "plan") throw new Error("expected plan");

    const expectedData = encodeFunctionData({
      abi: MealPactAbi,
      functionName: "createPact",
      args: [PROPOSAL_HASH, 1n],
    });

    expect(result.chainId).toBe(MEAL_PACT_CHAIN_ID);
    expect(result.verb).toBe("supply");
    expect(result.confirms).toContain("pactCreated");
    expect(result.txs).toHaveLength(1);
    expect(result.txs[0]).toMatchObject({
      from: ACCOUNT,
      to: MEAL_PACT_ADDRESS,
      data: expectedData,
      value: `0x${parseEther("0.001").toString(16)}`,
    });
    expect(result.expects.out?.[0]).toMatchObject({
      token: "native",
      amountMax: parseEther("0.001").toString(),
    });
  });

  it("rejects unsupported durations before building a plan", async () => {
    const registry = new Registry(testRuntime());
    registry.register(LaterMeProtocol);

    await expect(
      registry.action("laterme", "createPact", ACCOUNT, {
        proposalHash: PROPOSAL_HASH,
        durationSeconds: "30",
        amount: "0.001",
      }),
    ).rejects.toThrow(/durationSeconds=1/);
  });

  it("rejects oversized lock amounts", async () => {
    const registry = new Registry(testRuntime());
    registry.register(LaterMeProtocol);

    await expect(
      registry.action("laterme", "createPact", ACCOUNT, {
        proposalHash: PROPOSAL_HASH,
        durationSeconds: "1",
        amount: "1",
      }),
    ).rejects.toThrow(/demo max/);
  });

  it("builds expirePact as a refund claim plan", async () => {
    const registry = new Registry(testRuntime());
    registry.register(LaterMeProtocol);

    const result = await registry.action("laterme", "expirePact", ACCOUNT, {
      pactId: "7",
      amount: "0.001",
    });

    expect(result.kind).toBe("plan");
    if (result.kind !== "plan") throw new Error("expected plan");

    const expectedData = encodeFunctionData({
      abi: MealPactAbi,
      functionName: "expirePact",
      args: [7n],
    });

    expect(result.verb).toBe("claim");
    expect(result.confirms).toContain("pactExpired");
    expect(result.txs[0]?.data).toBe(expectedData);
    expect(result.expects.in?.[0]).toMatchObject({
      token: "native",
      amountMin: parseEther("0.001").toString(),
    });
  });
});
