"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { SiteHeader } from "@/components/site-header";
import {
  PACT_DRAFT_STORAGE_KEY,
  type PactChoice,
} from "@/lib/pact";
import type { NegotiateResponse } from "@/lib/negotiate/schema";

const suggestions = ["Fried chicken and milk tea", "A late-night snack", "Office cookies"];

export default function NegotiatePage() {
  const router = useRouter();
  const [mealText, setMealText] = useState("");
  const [submittedMeal, setSubmittedMeal] = useState("");
  const [choices, setChoices] = useState<PactChoice[]>([]);
  const [source, setSource] = useState<NegotiateResponse["source"] | null>(null);
  const [safetyReason, setSafetyReason] = useState<string | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<PactChoice["id"] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedMeal = mealText.trim();

    if (normalizedMeal.length < 2) {
      setError("Tell LaterMe what you are thinking about eating.");
      return;
    }

    setError("");
    setSafetyReason(null);
    setSelectedChoice(null);
    setChoices([]);
    setSource(null);
    setSubmittedMeal(normalizedMeal);
    setLoading(true);

    try {
      const response = await fetch("/api/negotiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mealText: normalizedMeal }),
      });

      const payload = (await response.json()) as NegotiateResponse & {
        error?: string;
      };

      if (!response.ok) {
        setError(payload.error || "Negotiation failed. Try again.");
        return;
      }

      setSource(payload.source);
      setSafetyReason(payload.safety.reason);
      setChoices(payload.choices);

      if (payload.safety.level === "refuse") {
        setError(
          payload.safety.reason ||
            "LaterMe cannot help with that request. Please seek professional support.",
        );
      } else if (payload.safety.level === "needs_clarification") {
        setError(
          payload.safety.reason ||
            "Tell LaterMe a bit more specifically what you are about to eat.",
        );
      }
    } catch {
      setError("Negotiation is temporarily unavailable. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function continueWithChoice() {
    const choice = choices.find((item) => item.id === selectedChoice);
    if (!choice) return;

    localStorage.setItem(
      PACT_DRAFT_STORAGE_KEY,
      JSON.stringify({
        mealText: submittedMeal,
        choice,
        createdAt: new Date().toISOString(),
      }),
    );
    router.push("/pact/new");
  }

  return (
    <main className="flow-page">
      <SiteHeader />
      <div className="flow-shell shell">
        <Link className="back-link" href="/">
          ← Back home
        </Link>

        <section className="flow-intro">
          <p className="eyebrow">Step 1 of 2 · The conversation</p>
          <h1>What are you about to eat?</h1>
          <p>
            Be honest. LaterMe is here to negotiate a doable next move, not grade
            your choice.
          </p>
        </section>

        <form className="meal-form" onSubmit={handleSubmit}>
          <label htmlFor="meal">Right now, I want…</label>
          <div className="meal-input-row">
            <input
              autoComplete="off"
              disabled={loading}
              id="meal"
              maxLength={280}
              onChange={(event) => setMealText(event.target.value)}
              placeholder="Fried chicken and milk tea"
              value={mealText}
            />
            <button className="button button-dark" disabled={loading} type="submit">
              {loading ? "Negotiating…" : "Show my options"}
            </button>
          </div>
          <div className="suggestion-row">
            {suggestions.map((suggestion) => (
              <button
                disabled={loading}
                key={suggestion}
                onClick={() => setMealText(suggestion)}
                type="button"
              >
                {suggestion}
              </button>
            ))}
          </div>
          {error && <p className="form-error">{error}</p>}
        </form>

        {choices.length > 0 && (
          <section className="choice-section" aria-live="polite">
            <div className="choice-heading">
              <div>
                <p className="eyebrow">Two honest futures</p>
                <h2>You choose which one becomes real.</h2>
              </div>
              <span className="safe-fallback-pill">
                {source === "llm" ? "AI proposal" : "Safe fallback proposal"}
              </span>
            </div>

            <div className="choice-grid">
              {choices.map((choice) => {
                const selected = selectedChoice === choice.id;
                return (
                  <button
                    aria-pressed={selected}
                    className={`choice-card ${selected ? "selected" : ""}`}
                    key={choice.id}
                    onClick={() => setSelectedChoice(choice.id)}
                    type="button"
                  >
                    <div className="choice-card-topline">
                      <span>{choice.id === "current" ? "Current Me" : "Later Me"}</span>
                      <span className="choice-check">{selected ? "✓" : ""}</span>
                    </div>
                    <h3>{choice.label}</h3>
                    <p>{choice.summary}</p>
                    <div className="choice-action">
                      <span>{choice.durationSeconds} second demo pact</span>
                      <strong>{choice.actionText}</strong>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="choice-footer">
              <p>
                {safetyReason
                  ? safetyReason
                  : "Nothing is sent onchain until your wallet confirms it."}
              </p>
              <button
                className="button button-accent button-large"
                disabled={!selectedChoice}
                onClick={continueWithChoice}
                type="button"
              >
                Review this pact →
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
