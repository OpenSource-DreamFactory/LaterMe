import assert from "node:assert/strict";
import test from "node:test";

import { parsePactDraft } from "./pact.ts";

test("migrates an existing minute-based draft to the 1-second demo", () => {
  const draft = parsePactDraft(
    JSON.stringify({
      mealText: "Fried chicken",
      choice: {
        id: "current",
        label: "Keep the meal, add a pause",
        summary: "Demo",
        actionText: "Wait",
        actionType: "mindful_pause",
        durationMinutes: 10,
      },
      createdAt: "2026-08-09T00:00:00.000Z",
    }),
  );

  assert.equal(draft?.choice.durationSeconds, 1);
  assert.equal("durationMinutes" in (draft?.choice ?? {}), false);
});

test("rejects malformed saved drafts", () => {
  assert.equal(parsePactDraft("not json"), null);
  assert.equal(parsePactDraft(JSON.stringify({ mealText: "Demo" })), null);
});
