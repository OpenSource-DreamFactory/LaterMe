import { createSafeProposal } from "../pact.ts";

import { readLlmConfig, requestPactProposal, type LlmConfig } from "./llm.ts";
import {
  negotiateRequestSchema,
  proposalToChoices,
  type NegotiateResponse,
  type PactProposal,
} from "./schema.ts";
import { detectUnsafeMealRequest, looksLikeJailbreak } from "./safety.ts";

export type NegotiateDeps = {
  llmConfig?: LlmConfig | null;
  requestProposal?: typeof requestPactProposal;
};

function fallbackProposal(mealText: string): PactProposal {
  const [current, future] = createSafeProposal(mealText);
  return {
    currentChoice: {
      label: current.label,
      summary: current.summary,
      actionType: current.actionType,
      actionText: current.actionText,
    },
    futureChoice: {
      label: future.label,
      summary: future.summary,
      actionType: future.actionType,
      actionText: future.actionText,
    },
    pact: { durationSeconds: 1 },
    safety: { level: "normal", reason: null },
  };
}

function refuseResponse(mealText: string, reason: string): NegotiateResponse {
  return {
    mealText,
    source: "fallback",
    safety: { level: "refuse", reason },
    choices: [],
    fallbackReason: reason,
  };
}

function withFallback(
  mealText: string,
  fallbackReason: string,
): NegotiateResponse {
  const proposal = fallbackProposal(mealText);
  return {
    mealText,
    source: "fallback",
    safety: proposal.safety,
    choices: proposalToChoices(proposal),
    fallbackReason,
  };
}

export async function negotiateMeal(
  input: unknown,
  deps: NegotiateDeps = {},
): Promise<NegotiateResponse> {
  const { mealText } = negotiateRequestSchema.parse(input);

  const refuseReason = detectUnsafeMealRequest(mealText);
  if (refuseReason) {
    return refuseResponse(mealText, refuseReason);
  }

  if (looksLikeJailbreak(mealText)) {
    return withFallback(
      mealText,
      "Prompt-injection style input was ignored; using the safe local proposal.",
    );
  }

  const llmConfig = deps.llmConfig === undefined ? readLlmConfig() : deps.llmConfig;
  const requestProposal = deps.requestProposal ?? requestPactProposal;

  if (!llmConfig) {
    return withFallback(
      mealText,
      "OPENAI_API_KEY is not configured; using the safe local proposal.",
    );
  }

  try {
    const proposal = await requestProposal(mealText, llmConfig);
    if (proposal.safety.level === "refuse") {
      return {
        mealText,
        source: "llm",
        safety: proposal.safety,
        choices: [],
      };
    }

    return {
      mealText,
      source: "llm",
      safety: proposal.safety,
      choices: proposalToChoices(proposal),
    };
  } catch (firstError) {
    try {
      const proposal = await requestProposal(mealText, llmConfig);
      if (proposal.safety.level === "refuse") {
        return {
          mealText,
          source: "llm",
          safety: proposal.safety,
          choices: [],
        };
      }

      return {
        mealText,
        source: "llm",
        safety: proposal.safety,
        choices: proposalToChoices(proposal),
      };
    } catch (secondError) {
      const reason =
        secondError instanceof Error
          ? secondError.message
          : firstError instanceof Error
            ? firstError.message
            : "LLM negotiation failed";
      return withFallback(mealText, reason);
    }
  }
}
