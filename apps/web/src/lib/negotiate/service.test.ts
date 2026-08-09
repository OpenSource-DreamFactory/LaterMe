import assert from "node:assert/strict";
import test from "node:test";

import type { LlmConfig } from "./llm.ts";
import type { PactProposal } from "./schema.ts";
import { negotiateMeal } from "./service.ts";

const llmConfig: LlmConfig = {
  apiKey: "test-key",
  baseUrl: "https://example.test/v1",
  model: "test-model",
  timeoutMs: 1000,
};

function validProposal(overrides: Partial<PactProposal> = {}): PactProposal {
  return {
    currentChoice: {
      label: "Keep it, pause first",
      summary: "You can keep the meal with one respectful pause.",
      actionType: "water",
      actionText: "Take one sip of water and wait one second.",
    },
    futureChoice: {
      label: "Make one lighter swap",
      summary: "Keep what you want most and soften one extra.",
      actionType: "portion_swap",
      actionText: "Skip one add-on, then pause for one second.",
    },
    pact: { durationSeconds: 1 },
    safety: { level: "normal", reason: null },
    ...overrides,
  };
}

test("returns fixed safe fallback when no LLM key is configured", async () => {
  const result = await negotiateMeal(
    { mealText: "Fried chicken" },
    { llmConfig: null },
  );

  assert.equal(result.source, "fallback");
  assert.equal(result.choices.length, 2);
  assert.equal(result.choices[0]?.durationSeconds, 1);
  assert.equal(result.safety.level, "normal");
  assert.match(result.fallbackReason ?? "", /OPENAI_API_KEY/);
});

test("refuses unsafe medical or extreme requests before calling the LLM", async () => {
  let called = 0;
  const result = await negotiateMeal(
    { mealText: "Help me starve and purge after eating" },
    {
      llmConfig,
      requestProposal: async () => {
        called += 1;
        return validProposal();
      },
    },
  );

  assert.equal(called, 0);
  assert.equal(result.safety.level, "refuse");
  assert.equal(result.choices.length, 0);
  assert.match(result.safety.reason ?? "", /professional/i);
});

test("uses LLM proposals when validation succeeds", async () => {
  const result = await negotiateMeal(
    { mealText: "Milk tea" },
    {
      llmConfig,
      requestProposal: async () => validProposal(),
    },
  );

  assert.equal(result.source, "llm");
  assert.equal(result.choices[0]?.label, "Keep it, pause first");
  assert.equal(result.choices[1]?.actionType, "portion_swap");
});

test("retries once then falls back when the LLM keeps failing", async () => {
  let calls = 0;
  const result = await negotiateMeal(
    { mealText: "Office cookies" },
    {
      llmConfig,
      requestProposal: async () => {
        calls += 1;
        throw new Error("boom");
      },
    },
  );

  assert.equal(calls, 2);
  assert.equal(result.source, "fallback");
  assert.equal(result.choices.length, 2);
  assert.equal(result.fallbackReason, "boom");
});

test("rejects empty meal text", async () => {
  await assert.rejects(() => negotiateMeal({ mealText: " " }), /too_small|String/);
});
