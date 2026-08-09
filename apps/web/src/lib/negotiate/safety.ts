const REFUSE_PATTERNS = [
  /\b(anorexi|bulimi|purge|purging|laxative|vomit)\b/i,
  /\b(starve|starvation|fasting for days|zero calorie)\b/i,
  /\b(eat disorder|disordered eating)\b/i,
  /\b(ozempic|semaglutide|phentermine|diet pill|weight loss drug)\b/i,
  /\b(diagnose|prescription|prescribe|medical advice|doctor)\b/i,
  /\b(suicide|self[- ]harm|kill myself)\b/i,
  /\b(extreme workout|run until|exercise until exhaustion)\b/i,
];

export function detectUnsafeMealRequest(mealText: string): string | null {
  const normalized = mealText.trim();
  for (const pattern of REFUSE_PATTERNS) {
    if (pattern.test(normalized)) {
      return "LaterMe cannot help with medical, extreme, or unsafe dieting requests. Please talk with a qualified professional.";
    }
  }
  return null;
}

export function looksLikeJailbreak(mealText: string): boolean {
  return /(ignore (all|previous) instructions|system prompt|act as|jailbreak)/i.test(
    mealText,
  );
}
