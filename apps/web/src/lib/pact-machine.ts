export type PactPhase =
  | "DRAFT"
  | "READY"
  | "AWAITING_SIGNATURE"
  | "TX_PENDING"
  | "ACTIVE"
  | "FAILED";

export type PactState = {
  phase: PactPhase;
  transactionHash?: `0x${string}`;
  pactId?: bigint;
  error?: string;
};

export type PactEvent =
  | { type: "READY" }
  | { type: "REQUEST_SIGNATURE" }
  | { type: "TRANSACTION_SENT"; transactionHash: `0x${string}` }
  | { type: "TRANSACTION_CONFIRMED"; pactId?: bigint }
  | { type: "FAILED"; error: string }
  | { type: "RESET" };

export const initialPactState: PactState = { phase: "DRAFT" };

export function pactReducer(state: PactState, event: PactEvent): PactState {
  switch (event.type) {
    case "READY":
      return { phase: "READY" };
    case "REQUEST_SIGNATURE":
      return { ...state, phase: "AWAITING_SIGNATURE", error: undefined };
    case "TRANSACTION_SENT":
      return {
        phase: "TX_PENDING",
        transactionHash: event.transactionHash,
      };
    case "TRANSACTION_CONFIRMED":
      return { ...state, phase: "ACTIVE", pactId: event.pactId };
    case "FAILED":
      return { ...state, phase: "FAILED", error: event.error };
    case "RESET":
      return initialPactState;
  }
}
