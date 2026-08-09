# `@laterme/protocol-laterme`

Moss Protocol package that exposes LaterMe `MealPact` as Agent-callable Capabilities:

`discover → load → action → simulate`

Moss builds and verifies unsigned transactions. It never signs or sends them.

## Capabilities

| Method | Verb | Purpose |
| --- | --- | --- |
| `createPact` | `supply` | Lock native MON into a 1-second demo pact |
| `completePact` | `claim` | Complete before deadline and refund |
| `cancelPact` | `withdraw` | Cancel and refund |
| `expirePact` | `claim` | Expire after deadline and refund |
| `getPact` | query | Read pact state |

## Network note

Moss upstream currently targets Monad mainnet (`143`). This package points at the LaterMe hackathon deployment on **Monad Testnet** (`10143`):

`0xC187dC6b75DA1255cF9bEb52d8e9585A7e483315`

Use a matching runtime:

```ts
import { createRuntime, Registry } from "@themoss/core";
import {
  MEAL_PACT_CHAIN_ID,
  latermeManifest,
} from "@laterme/protocol-laterme";

const runtime = createRuntime({
  rpcUrl: "https://monad-testnet-rpc.huginn.tech",
  chainId: MEAL_PACT_CHAIN_ID,
});
const registry = new Registry(runtime);
registry.use(latermeManifest);

const plan = await registry.action("laterme", "createPact", account, {
  proposalHash: "0x…",
  durationSeconds: "1",
  amount: "0.001",
});
```

## Safety rules

- `durationSeconds` must be `1`
- lock amount must be `> 0` and `<= 0.01 MON`
- Agent / UI must still ask the user wallet to sign the returned Plan

## Develop

```bash
pnpm --filter @laterme/protocol-laterme test
pnpm --filter @laterme/protocol-laterme build
```
