import assert from "node:assert/strict";
import test from "node:test";

import {
  createBlockRanges,
  getPactDisplayStatus,
  parsePactId,
} from "./pact-records.ts";

test("splits RPC log queries into bounded inclusive ranges", () => {
  assert.deepEqual(createBlockRanges(100n, 2_000n, 900n), [
    { fromBlock: 100n, toBlock: 999n },
    { fromBlock: 1_000n, toBlock: 1_899n },
    { fromBlock: 1_900n, toBlock: 2_000n },
  ]);
});

test("marks an active pact as ready to expire at its deadline", () => {
  assert.equal(getPactDisplayStatus(1, 115n, 114n), "Active");
  assert.equal(getPactDisplayStatus(1, 115n, 115n), "Ready to expire");
  assert.equal(getPactDisplayStatus(2, 115n, 200n), "Completed");
});

test("accepts only positive integer pact IDs", () => {
  assert.equal(parsePactId("42"), 42n);
  assert.equal(parsePactId("0"), null);
  assert.equal(parsePactId("1.5"), null);
});
