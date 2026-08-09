export type PactActionType =
  | "walk"
  | "water"
  | "portion_swap"
  | "mindful_pause";

export type PactDurationSeconds = 1;

export type PactChoice = {
  id: "current" | "future";
  label: string;
  summary: string;
  actionText: string;
  actionType: PactActionType;
  durationSeconds: PactDurationSeconds;
};

export type PactDraft = {
  mealText: string;
  choice: PactChoice;
  createdAt: string;
};

export const PACT_DRAFT_STORAGE_KEY = "laterme:pact-draft";

export function createSafeProposal(mealText: string): PactChoice[] {
  return [
    {
      id: "current",
      label: "Keep the meal, add a pause",
      summary: `You can still choose ${mealText.trim()}, with one small moment of intention first.`,
      actionText: "Drink a glass of water and wait 1 second before the first bite.",
      actionType: "mindful_pause",
      durationSeconds: 1,
    },
    {
      id: "future",
      label: "Make one lighter swap",
      summary: "Keep the part you want most, and replace one extra with a lighter option.",
      actionText: "Choose one portion swap, then pause for 1 second before eating.",
      actionType: "portion_swap",
      durationSeconds: 1,
    },
  ];
}

export function parsePactDraft(savedDraft: string): PactDraft | null {
  try {
    const draft = JSON.parse(savedDraft) as PactDraft;
    if (!draft.mealText || !draft.choice) return null;
    const choice = {
      ...draft.choice,
    } as PactChoice & { durationMinutes?: number };
    delete choice.durationMinutes;

    return {
      ...draft,
      choice: {
        ...choice,
        durationSeconds: 1,
      },
    };
  } catch {
    return null;
  }
}
