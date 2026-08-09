import { Registry, createRuntime, type MossRuntime } from "@themoss/core";
import { createTraceSimulator, type Simulator } from "@themoss/simulator";
import {
  MEAL_PACT_CHAIN_ID,
  latermeManifest,
} from "@laterme/protocol-laterme";

import { monadTestnet } from "../chain.ts";

let cachedRuntime: MossRuntime | undefined;
let cachedRegistry: Registry | undefined;
let cachedSimulator: Simulator | undefined;

export function getMossRuntime(): MossRuntime {
  if (!cachedRuntime) {
    cachedRuntime = createRuntime({
      rpcUrl: monadTestnet.rpcUrls.default.http[0]!,
      chainId: MEAL_PACT_CHAIN_ID,
    });
  }
  return cachedRuntime;
}

export function getMossRegistry(): Registry {
  if (!cachedRegistry) {
    cachedRegistry = new Registry(getMossRuntime());
    cachedRegistry.use(latermeManifest);
  }
  return cachedRegistry;
}

export function getMossSimulator(): Simulator {
  if (!cachedSimulator) {
    const runtime = getMossRuntime();
    const registry = getMossRegistry();
    cachedSimulator = createTraceSimulator(runtime, {
      observer: registry.observer(),
    });
  }
  return cachedSimulator;
}
