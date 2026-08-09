import { z, ZodError } from "zod";

import type { PactChoice } from "../pact.ts";

export const pactActionTypeSchema = z.enum([
  "walk",
  "water",
  "portion_swap",
  "mindful_pause",
]);

// Keep mins low so short Chinese replies from Kimi still validate.
export const choiceContentSchema = z.object({
  label: z.string().trim().min(1).max(80),
  summary: z.string().trim().min(4).max(280),
  actionType: pactActionTypeSchema,
  actionText: z.string().trim().min(4).max(200),
});

export const pactProposalSchema = z.object({
  currentChoice: choiceContentSchema,
  futureChoice: choiceContentSchema,
  pact: z.object({
    durationSeconds: z.literal(1),
  }),
  safety: z.object({
    level: z.enum(["normal", "needs_clarification", "refuse"]),
    reason: z.string().trim().max(280).nullable(),
  }),
});

export type PactProposal = z.infer<typeof pactProposalSchema>;

export const negotiateRequestSchema = z.object({
  mealText: z.string().trim().min(2).max(280),
});

export type NegotiateSource = "llm" | "fallback";

export type NegotiateResponse = {
  mealText: string;
  source: NegotiateSource;
  safety: PactProposal["safety"];
  choices: PactChoice[];
  fallbackReason?: string | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function normalizeChoice(value: unknown, mealText: string): unknown {
  const choice = asRecord(value);
  if (!choice) return value;

  const label = typeof choice.label === "string" ? choice.label.trim() : "";
  const summary = typeof choice.summary === "string" ? choice.summary.trim() : "";
  const actionText =
    typeof choice.actionText === "string" ? choice.actionText.trim() : "";

  return {
    ...choice,
    label: label || mealText.slice(0, 40) || "Choice",
    summary:
      summary.length >= 4
        ? summary
        : `${summary || label || mealText} — a respectful next step.`.slice(0, 280),
    actionText:
      actionText.length >= 4
        ? actionText
        : `${actionText || "Pause for one second"} before the first bite.`.slice(
            0,
            200,
          ),
  };
}

/** Soft-repair short LLM fields before strict schema validation. */
export function normalizePactProposal(
  value: unknown,
  mealText: string,
): unknown {
  const proposal = asRecord(value);
  if (!proposal) return value;

  const pact = asRecord(proposal.pact) ?? {};
  const safety = asRecord(proposal.safety) ?? {};

  return {
    ...proposal,
    currentChoice: normalizeChoice(proposal.currentChoice, mealText),
    futureChoice: normalizeChoice(proposal.futureChoice, mealText),
    pact: {
      ...pact,
      durationSeconds: 1,
    },
    safety: {
      level: safety.level ?? "normal",
      reason: safety.reason ?? null,
    },
  };
}

export function formatProposalValidationError(error: unknown): string {
  if (error instanceof ZodError) {
    const parts = error.issues.slice(0, 3).map((issue) => {
      const path = issue.path.join(".") || "proposal";
      return `${path}: ${issue.message}`;
    });
    return `AI proposal failed validation (${parts.join("; ")})`;
  }
  if (error instanceof Error) return error.message;
  return "AI proposal failed validation";
}

export function parsePactProposal(
  value: unknown,
  mealText: string,
): PactProposal {
  return pactProposalSchema.parse(normalizePactProposal(value, mealText));
}

export function proposalToChoices(proposal: PactProposal): PactChoice[] {
  return [
    {
      id: "current",
      label: proposal.currentChoice.label,
      summary: proposal.currentChoice.summary,
      actionType: proposal.currentChoice.actionType,
      actionText: proposal.currentChoice.actionText,
      durationSeconds: 1,
    },
    {
      id: "future",
      label: proposal.futureChoice.label,
      summary: proposal.futureChoice.summary,
      actionType: proposal.futureChoice.actionType,
      actionText: proposal.futureChoice.actionText,
      durationSeconds: 1,
    },
  ];
}
