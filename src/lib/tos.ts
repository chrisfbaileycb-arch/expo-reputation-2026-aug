/**
 * Terms-of-Service compliance scanner for outbound review-response drafts.
 * Ported verbatim from expo-proxy/apps/echo-proxy/src/tos.ts — pure, deterministic,
 * no side effects. Gate every auto-post and every operator approval through this.
 */

export type TosPlatform = "google" | "yelp" | "facebook";

export interface TosViolation {
  code: string;
  detail: string;
}

export interface TosResult {
  ok: boolean;
  violations: TosViolation[];
}

const STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "but",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "with",
  "by",
  "from",
  "is",
  "was",
  "are",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "shall",
  "should",
  "may",
  "might",
  "must",
  "can",
  "could",
  "that",
  "this",
  "these",
  "those",
  "i",
  "you",
  "we",
  "they",
  "he",
  "she",
  "it",
  "us",
  "our",
  "your",
  "their",
  "my",
  "his",
  "her",
  "its",
  "so",
  "if",
  "not",
  "no",
  "than",
  "then",
  "as",
  "up",
  "out",
  "very",
  "just",
  "about",
  "what",
  "which",
  "who",
  "how",
  "all",
  "each",
  "more",
  "also",
  "into",
  "over",
  "after",
  "before",
  "because",
  "when",
  "where",
  "while",
  "come",
  "go",
  "get",
  "make",
  "take",
  "know",
  "see",
  "look",
  "want",
  "give",
  "use",
  "find",
  "tell",
  "ask",
  "seem",
  "feel",
  "try",
  "leave",
  "call",
]);

const AGGRESSIVE_BLOCKLIST: string[] = [
  "liar",
  "fake review",
  "lawsuit",
  "stupid",
  "never come back",
  "idiot",
  "ridiculous",
  "pathetic",
  "moron",
  "shut up",
];

const URL_PATTERN = /https?:\/\/|www\.|promo\s*code/i;
const MAX_LENGTH = 700;
const MAX_CAPS_FRACTION = 0.3;

export function scanTosCompliance(draft: string, platform: TosPlatform): TosResult {
  void platform; // reserved for future per-platform rule sets
  const violations: TosViolation[] = [];

  if (URL_PATTERN.test(draft)) {
    violations.push({
      code: "URL_OR_PROMO_LINK",
      detail: 'Response must not contain URLs, "www." links, or promo codes.',
    });
  }

  const tokens = draft
    .toLowerCase()
    .replace(/[^a-z\s'-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));

  const freq = new Map<string, number>();
  for (const token of tokens) freq.set(token, (freq.get(token) ?? 0) + 1);
  for (const [word, count] of freq) {
    if (count > 3) {
      violations.push({
        code: "KEYWORD_STUFFING",
        detail: `The word "${word}" appears ${count} times (max 3).`,
      });
      break;
    }
  }

  const lowerDraft = draft.toLowerCase();
  for (const phrase of AGGRESSIVE_BLOCKLIST) {
    if (lowerDraft.includes(phrase)) {
      violations.push({
        code: "AGGRESSIVE_LANGUAGE",
        detail: `Response contains prohibited phrase: "${phrase}".`,
      });
      break;
    }
  }

  if (draft.length > MAX_LENGTH) {
    violations.push({
      code: "EXCESSIVE_LENGTH",
      detail: `Response is ${draft.length} characters (max ${MAX_LENGTH}).`,
    });
  }

  const alphaChars = draft.replace(/[^a-zA-Z]/g, "");
  if (alphaChars.length > 0) {
    const upperCount = alphaChars.replace(/[^A-Z]/g, "").length;
    const capsFraction = upperCount / alphaChars.length;
    if (capsFraction > MAX_CAPS_FRACTION) {
      violations.push({
        code: "EXCESSIVE_CAPS",
        detail: `${Math.round(capsFraction * 100)}% of letters are uppercase (max ${Math.round(MAX_CAPS_FRACTION * 100)}%).`,
      });
    }
  }

  return { ok: violations.length === 0, violations };
}
