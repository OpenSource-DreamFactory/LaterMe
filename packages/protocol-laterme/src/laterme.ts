import {
  Capability,
  type DecodedEvent,
  Event,
  type Handle,
  NATIVE,
  type ObserveCtx,
  Protocol,
  Query,
  defineProtocolPackage,
  nativeAmount,
  plan,
  uint,
} from "@themoss/core";

import { MealPactAbi } from "./abis/meal-pact.js";
import { MEAL_PACT_ADDRESS } from "./addresses.js";
import {
  ALLOWED_DURATION_SECONDS,
  MAX_PACT_AMOUNT_WEI,
  bytes32,
} from "./params.js";

function assertAllowedDuration(durationSeconds: bigint) {
  if (durationSeconds !== ALLOWED_DURATION_SECONDS) {
    throw new Error(
      `LaterMe demo only allows durationSeconds=${ALLOWED_DURATION_SECONDS}, got ${durationSeconds}`,
    );
  }
}

function assertAllowedAmount(amount: bigint) {
  if (amount <= 0n) {
    throw new Error("LaterMe pact amount must be greater than zero");
  }
  if (amount > MAX_PACT_AMOUNT_WEI) {
    throw new Error(
      `LaterMe pact amount exceeds demo max of ${MAX_PACT_AMOUNT_WEI} wei`,
    );
  }
}

@Protocol({
  name: "laterme",
  category: "rewards",
  description:
    "LaterMe MealPact micro-commitments: lock a tiny amount of native MON into a short pact, then complete, cancel, or expire it for a full refund.",
  contracts: {
    mealPact: { abi: MealPactAbi, addr: MEAL_PACT_ADDRESS },
  },
})
export class LaterMeProtocol {
  declare mealPact: Handle<typeof MealPactAbi>;

  @Capability({
    intent:
      "Create a LaterMe meal pact locking {amount} MON for {durationSeconds} seconds with proposal {proposalHash}",
    verb: "supply",
    params: {
      proposalHash: bytes32,
      durationSeconds: uint,
      amount: nativeAmount,
    },
    risk: ["fundOut"],
    tags: ["pact", "commitment", "laterme"],
    confirms: ["pactCreated"],
  })
  async createPact({
    proposalHash,
    durationSeconds,
    amount,
  }: {
    proposalHash: `0x${string}`;
    durationSeconds: bigint;
    amount: bigint;
  }) {
    assertAllowedDuration(durationSeconds);
    assertAllowedAmount(amount);

    const tx = this.mealPact.createPact([proposalHash, durationSeconds], {
      value: amount,
    });

    return plan([tx], {
      out: [{ token: NATIVE, amountMax: amount }],
    });
  }

  @Capability({
    intent:
      "Complete LaterMe pact {pactId} with proof {completionHash} and refund {amount} MON",
    verb: "claim",
    params: {
      pactId: uint,
      completionHash: bytes32,
      amount: nativeAmount,
    },
    risk: ["fundOut"],
    tags: ["pact", "settlement", "laterme"],
    confirms: ["pactCompleted"],
  })
  async completePact({
    pactId,
    completionHash,
    amount,
  }: {
    pactId: bigint;
    completionHash: `0x${string}`;
    amount: bigint;
  }) {
    assertAllowedAmount(amount);
    const tx = this.mealPact.completePact([pactId, completionHash]);
    return plan([tx], {
      in: [{ token: NATIVE, amountMin: amount }],
    });
  }

  @Capability({
    intent: "Cancel LaterMe pact {pactId} and refund {amount} MON",
    verb: "withdraw",
    params: {
      pactId: uint,
      amount: nativeAmount,
    },
    risk: ["fundOut"],
    tags: ["pact", "settlement", "laterme"],
    confirms: ["pactCancelled"],
  })
  async cancelPact({
    pactId,
    amount,
  }: {
    pactId: bigint;
    amount: bigint;
  }) {
    assertAllowedAmount(amount);
    const tx = this.mealPact.cancelPact([pactId]);
    return plan([tx], {
      in: [{ token: NATIVE, amountMin: amount }],
    });
  }

  @Capability({
    intent: "Expire LaterMe pact {pactId} after deadline and refund {amount} MON",
    verb: "claim",
    params: {
      pactId: uint,
      amount: nativeAmount,
    },
    risk: ["fundOut"],
    tags: ["pact", "settlement", "laterme"],
    confirms: ["pactExpired"],
  })
  async expirePact({
    pactId,
    amount,
  }: {
    pactId: bigint;
    amount: bigint;
  }) {
    assertAllowedAmount(amount);
    const tx = this.mealPact.expirePact([pactId]);
    return plan([tx], {
      in: [{ token: NATIVE, amountMin: amount }],
    });
  }

  @Query({
    intent: "Read LaterMe pact {pactId} state",
    params: { pactId: uint },
    tags: ["pact", "laterme"],
  })
  async getPact({ pactId }: { pactId: bigint }) {
    const pact = await this.mealPact.read.getPact([pactId]);
    return {
      pactId: pactId.toString(),
      owner: pact.owner,
      deadline: pact.deadline.toString(),
      amount: pact.amount.toString(),
      proposalHash: pact.proposalHash,
      completionHash: pact.completionHash,
      status: Number(pact.status),
    };
  }

  @Event<LaterMeProtocol>({
    events: { mealPact: ["PactCreated"] },
    intent:
      "Created pact {pactId} for {owner}, locking {amount} MON until {deadline}",
  })
  async pactCreated(events: DecodedEvent[], _ctx: ObserveCtx) {
    const event = events[0];
    if (!event) return null;
    return {
      pactId: String(event.args.pactId),
      owner: String(event.args.owner),
      amount: String(event.args.amount),
      deadline: String(event.args.deadline),
    };
  }

  @Event<LaterMeProtocol>({
    events: { mealPact: ["PactCompleted"] },
    intent:
      "Completed pact {pactId} for {owner}, refunding {amount} MON with proof {completionHash}",
  })
  async pactCompleted(events: DecodedEvent[], _ctx: ObserveCtx) {
    const event = events[0];
    if (!event) return null;
    return {
      pactId: String(event.args.pactId),
      owner: String(event.args.owner),
      amount: String(event.args.amount),
      completionHash: String(event.args.completionHash),
    };
  }

  @Event<LaterMeProtocol>({
    events: { mealPact: ["PactCancelled"] },
    intent: "Cancelled pact {pactId} for {owner}, refunding {amount} MON",
  })
  async pactCancelled(events: DecodedEvent[], _ctx: ObserveCtx) {
    const event = events[0];
    if (!event) return null;
    return {
      pactId: String(event.args.pactId),
      owner: String(event.args.owner),
      amount: String(event.args.amount),
    };
  }

  @Event<LaterMeProtocol>({
    events: { mealPact: ["PactExpired"] },
    intent: "Expired pact {pactId} for {owner}, refunding {amount} MON",
  })
  async pactExpired(events: DecodedEvent[], _ctx: ObserveCtx) {
    const event = events[0];
    if (!event) return null;
    return {
      pactId: String(event.args.pactId),
      owner: String(event.args.owner),
      amount: String(event.args.amount),
    };
  }
}

export const latermeManifest = defineProtocolPackage({
  name: "laterme",
  protocols: [LaterMeProtocol],
  tokens: [],
});
