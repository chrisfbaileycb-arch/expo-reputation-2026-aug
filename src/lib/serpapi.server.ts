/**
 * SerpApi client for Yelp reviews.
 * Server-only. Never import into client code.
 *
 * Docs: https://serpapi.com/yelp-reviews
 */

export interface SerpApiYelpReview {
  source_review_id: string;
  author_name: string | null;
  rating: number | null;
  body: string;
  posted_at: string | null;
  source_url: string | null;
}

interface RawReview {
  id?: string;
  review_id?: string;
  rating?: number;
  date?: string;
  user?: { name?: string; link?: string };
  comment?: { text?: string; language?: string };
  link?: string;
}

const ENDPOINT = "https://serpapi.com/search.json";

/**
 * Fetch the latest reviews for a Yelp business via SerpApi.
 * `placeId` is the Yelp business slug (the last segment of the Yelp URL,
 * e.g. "gary-danko-san-francisco").
 */
export async function fetchYelpReviews(opts: {
  apiKey: string;
  placeId: string;
  maxPages?: number; // default 1 (first 10 reviews; enough for incremental polling)
}): Promise<SerpApiYelpReview[]> {
  const max = Math.max(1, Math.min(opts.maxPages ?? 1, 5));
  const out: SerpApiYelpReview[] = [];

  for (let page = 0; page < max; page++) {
    const url = new URL(ENDPOINT);
    url.searchParams.set("engine", "yelp_reviews");
    url.searchParams.set("place_id", opts.placeId);
    url.searchParams.set("api_key", opts.apiKey);
    if (page > 0) url.searchParams.set("start", String(page * 10));

    const res = await fetch(url.toString(), { method: "GET" });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`SerpApi ${res.status}: ${text.slice(0, 200)}`);
    }
    const json = (await res.json()) as { reviews?: RawReview[]; error?: string };
    if (json.error) throw new Error(`SerpApi: ${json.error}`);
    const list = Array.isArray(json.reviews) ? json.reviews : [];
    if (list.length === 0) break;

    for (const r of list) {
      const id = r.id ?? r.review_id;
      const body = r.comment?.text;
      if (!id || !body) continue;
      out.push({
        source_review_id: String(id).slice(0, 200),
        author_name: r.user?.name ? String(r.user.name).slice(0, 200) : null,
        rating: typeof r.rating === "number" ? Math.round(r.rating) : null,
        body: String(body).slice(0, 5000),
        posted_at: r.date ? parseYelpDate(r.date) : null,
        source_url: r.link ? String(r.link).slice(0, 2000) : null,
      });
    }
    if (list.length < 10) break;
  }

  return out;
}

/** Yelp dates come as "10/15/2024" or ISO. Normalize to ISO or null. */
function parseYelpDate(raw: string): string | null {
  const t = Date.parse(raw);
  if (!Number.isNaN(t)) return new Date(t).toISOString();
  const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const d = new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2]));
    return d.toISOString();
  }
  return null;
}
