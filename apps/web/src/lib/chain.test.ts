import assert from "node:assert/strict";
import test from "node:test";

import { isMonadTestnetChain, monadTestnet } from "./chain.ts";

test("accepts only the connected wallet's Monad Testnet chain ID", () => {
  assert.equal(isMonadTestnetChain(monadTestnet.id), true);
  assert.equal(isMonadTestnetChain(11_155_111), false);
  assert.equal(isMonadTestnetChain(undefined), false);
});
