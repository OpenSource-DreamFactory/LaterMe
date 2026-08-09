import { z } from "zod";

import type { PactChoice } from "../pact.ts";

export const pactActionTypeSchema = z.enum([
  "walk",
  "water",
  "portion_swap",
  "mindful_pause",
]);

export const choiceContentSchema = z.object({
  label: z.string().trim().min(2).max(80),
  summary: z.string().trim().min(8).max(280),
  actionType: pactActionTypeSchema,
  actionText: z.string().trim().min(8).max(200),
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
};

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
