/**
 * Deterministic draft generator — fallback when the AI gateway is unavailable.
 * Ported from expo-proxy/apps/echo-proxy/src/drafts.ts. No external calls.
 */

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
  "great",
  "good",
  "nice",
  "well",
  "really",
  "too",
  "always",
  "never",
  "ever",
  "every",
  "back",
  "again",
  "here",
  "there",
]);

function extractKeyPhrase(text: string): string {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z\s'-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
  if (tokens.length === 0) return "your experience";
  return tokens.reduce((best, t) => (t.length > best.length ? t : best), tokens[0]!);
}

function firstName(customerName: string | null | undefined): string {
  if (!customerName) return "there";
  return customerName.trim().split(/\s+/)[0] ?? "there";
}

export interface FallbackDraftInput {
  authorName: string | null;
  rating: number | null;
  body: string;
  contactEmail?: string | null;
}

export function deterministicDraft(input: FallbackDraftInput): string {
  const name = firstName(input.authorName);
  const phrase = extractKeyPhrase(input.body);
  const rating = input.rating ?? 0;
  const contact = input.contactEmail ?? "the owner directly";

  if (rating >= 4) {
    return (
      `Thank you so much, ${name}! We're thrilled to hear you enjoyed the ${phrase}. ` +
      `Your kind words mean a great deal to our team. We look forward to welcoming you back soon.`
    );
  }
  return (
    `We sincerely apologize, ${name}. We're sorry to hear your experience with ${phrase} ` +
    `didn't meet expectations. We'd love the chance to make it right — please reach out to ` +
    `${contact} so we can personally address your concerns.`
  );
}
