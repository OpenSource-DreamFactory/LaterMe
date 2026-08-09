import { type Hex, type SemanticType } from "@themoss/core";
import { isHex } from "viem";

/** A 32-byte 0x-prefixed hex hash (proposalHash / completionHash). */
export const bytes32: SemanticType<Hex> = {
  describe: 'A 32-byte hash encoded as a 0x-prefixed hexadecimal string, such as "0x" + 64 hex chars.',
  decode(value) {
    if (typeof value !== "string" || !isHex(value) || value.length !== 66) {
      throw new Error('Expected a 32-byte 0x-prefixed hex string (bytes32).');
    }
    return value;
  },
};

/** Demo lock amount upper bound: 0.01 MON. */
export const MAX_PACT_AMOUNT_WEI = 10n ** 16n;

/** LaterMe hackathon demo only allows 1-second pacts. */
export const ALLOWED_DURATION_SECONDS = 1n;
