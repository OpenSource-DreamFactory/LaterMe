import { NEGOTIATE_SYSTEM_PROMPT, buildNegotiateUserPrompt } from "./prompt.ts";
import {
  formatProposalValidationError,
  parsePactProposal,
  type PactProposal,
} from "./schema.ts";
export type LlmConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
  timeoutMs: number;
};

export function readLlmConfig(
  env: NodeJS.ProcessEnv = process.env,
): LlmConfig | null {
  const apiKey = env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  return {
    apiKey,
    baseUrl: (env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1").replace(
      /\/$/,
      "",
    ),
    model: env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
    timeoutMs: Number(env.OPENAI_TIMEOUT_MS || 12_000),
  };
}

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
};

export async function requestPactProposal(
  mealText: string,
  config: LlmConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<PactProposal> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetchImpl(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: NEGOTIATE_SYSTEM_PROMPT },
          { role: "user", content: buildNegotiateUserPrompt(mealText) },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const details = await response.text();
      let detailMessage = details.slice(0, 280);
      try {
        const parsed = JSON.parse(details) as {
          error?: { message?: string; code?: string };
        };
        detailMessage =
          parsed.error?.message || parsed.error?.code || detailMessage;
      } catch {
        // keep raw text
      }
      throw new Error(`LLM request failed with status ${response.status}: ${detailMessage}`);
    }

    const payload = (await response.json()) as ChatCompletionResponse;
    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("LLM returned an empty response");
    }

    const parsed = JSON.parse(content) as unknown;
    try {
      return parsePactProposal(parsed, mealText);
    } catch (error) {
      throw new Error(formatProposalValidationError(error));
    }
  } finally {
    clearTimeout(timer);
  }
}
