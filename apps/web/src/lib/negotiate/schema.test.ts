import assert from "node:assert/strict";
import test from "node:test";

import { parsePactProposal } from "./schema.ts";

test("accepts short Chinese AI proposals after normalization", () => {
  const proposal = parsePactProposal(
    {
      currentChoice: {
        label: "卤肉",
        summary: "先喝水",
        actionType: "water",
        actionText: "喝一口",
      },
      futureChoice: {
        label: "少油",
        summary: "换蔬菜",
        actionType: "portion_swap",
        actionText: "少加点",
      },
      pact: { durationSeconds: 1 },
      safety: { level: "normal", reason: null },
    },
    "卤肉",
  );

  assert.equal(proposal.currentChoice.label, "卤肉");
  assert.ok(proposal.currentChoice.summary.length >= 8);
  assert.ok(proposal.currentChoice.actionText.length >= 8);
  assert.ok(proposal.futureChoice.summary.length >= 8);
  assert.ok(proposal.futureChoice.actionText.length >= 8);
});
