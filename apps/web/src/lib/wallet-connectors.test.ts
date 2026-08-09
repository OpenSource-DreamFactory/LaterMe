import assert from "node:assert/strict";
import test from "node:test";

import {
  getSupportedWalletConnectors,
  getWalletConnectionError,
} from "./wallet-connectors.ts";

test("uses announced wallets instead of the contested window.ethereum fallback", () => {
  const connectors = getSupportedWalletConnectors([
    { id: "injected", name: "Injected", uid: "legacy" },
    {
      id: "app.phantom",
      name: "Phantom",
      rdns: "app.phantom",
      uid: "phantom",
    },
    {
      id: "io.metamask",
      name: "MetaMask",
      rdns: "io.metamask",
      uid: "metamask",
    },
    {
      id: "io.gate.wallet",
      name: "Gate Wallet",
      rdns: "io.gate.wallet",
      uid: "gate-wallet",
    },
  ]);

  assert.deepEqual(
    connectors.map(({ id }) => id),
    ["app.phantom", "io.metamask"],
  );
});

test("excludes Gate Wallet because its injected provider breaks EVM calls", () => {
  const connectors = getSupportedWalletConnectors([
    {
      id: "io.gate.wallet",
      name: "Gate Wallet",
      rdns: "io.gate.wallet",
      uid: "gate-wallet",
    },
  ]);

  assert.deepEqual(connectors, []);
});

test("keeps targeted MetaMask and Phantom fallbacks without EIP-6963 metadata", () => {
  const connectors = getSupportedWalletConnectors([
    { id: "metaMaskFallback", name: "MetaMask", uid: "metamask-target" },
    { id: "phantomFallback", name: "Phantom", uid: "phantom-target" },
  ]);

  assert.deepEqual(
    connectors.map(({ name }) => name),
    ["MetaMask", "Phantom"],
  );
});

test("prefers announced providers over targeted fallbacks", () => {
  const connectors = getSupportedWalletConnectors([
    { id: "metaMaskFallback", name: "MetaMask", uid: "metamask-target" },
    {
      id: "io.metamask",
      name: "MetaMask",
      rdns: "io.metamask",
      uid: "metamask-announced",
    },
  ]);

  assert.equal(connectors.length, 1);
  assert.equal(connectors[0]?.uid, "metamask-announced");
});

test("deduplicates repeated announcements from the same wallet", () => {
  const connectors = getSupportedWalletConnectors([
    {
      id: "app.phantom",
      name: "Phantom",
      rdns: "app.phantom",
      uid: "phantom-1",
    },
    {
      id: "app.phantom",
      name: "Phantom",
      rdns: "app.phantom",
      uid: "phantom-2",
    },
  ]);

  assert.equal(connectors.length, 1);
  assert.equal(connectors[0]?.uid, "phantom-1");
});

test("explains when the current browser cannot access an extension", () => {
  assert.match(
    getWalletConnectionError(new Error("Provider not found.")),
    /Chrome profile where your wallet extension is installed/,
  );
});
