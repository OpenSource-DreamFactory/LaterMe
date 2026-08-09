import type { Address } from "@themoss/core";

/**
 * LaterMe MealPact deployment on Monad Testnet (chain ID 10143).
 * Source: contracts/deployments/10143.json
 *
 * Moss upstream currently focuses on Monad mainnet (143). This package is the
 * LaterMe demo adapter and therefore points at the live hackathon deployment.
 */
export const MEAL_PACT_ADDRESS =
  "0xC187dC6b75DA1255cF9bEb52d8e9585A7e483315" as Address;

export const MEAL_PACT_CHAIN_ID = 10143;
export const MEAL_PACT_DEPLOYMENT_BLOCK = 52_095_976n;
