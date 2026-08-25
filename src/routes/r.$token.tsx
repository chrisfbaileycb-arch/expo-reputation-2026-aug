import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Star, ShieldCheck, Heart, ExternalLink, CheckCircle2 } from "lucide-react";
import {
  getOutreachByToken,
  submitFeedback,
  markPublicLinkClicked,
} from "@/lib/feedback.functions";

export const Route = createFileRoute("/r/$token")({
  head: () => ({
    meta: [
      { title: "How was your experience?" },
      { name: "robots", content: "noindex,nofollow" },
      { name: "description", content: "Share your feedback with us." },
    ],
  }),
  component: FeedbackPage,
});

type Stage = "loading" | "rate" | "interception" | "elevation" | "thanks" | "error";

function FeedbackPage() {
  const { token } = Route.useParams();
  const getCtx = useServerFn(getOutreachByToken);
  const submit = useServerFn(submitFeedback);
  const trackClick = useServerFn(markPublicLinkClicked);

  const [stage, setStage] = useState<Stage>("loading");
  const [ctx, setCtx] = useState<{ location_name: string; contact_first_name: string } | null>(
    null,
  );
  const [rating, setRating] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [reviewUrl, setReviewUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getCtx({ data: { token } })
      .then((r) => {
        if (r.alreadySubmitted) setStage("thanks");
        else {
          setCtx({ location_name: r.location_name, contact_first_name: r.contact_first_name });
          setStage("rate");
        }
      })
      .catch((e: Error) => {
        setErrorMsg(e.message || "This link is no longer valid.");
        setStage("error");
      });
  }, [token, getCtx]);

  async function handleSubmit() {
    if (!rating) return;
    setBusy(true);
    try {
      const res = await submit({ data: { token, rating, comment: comment || null } });
      if (res.routed_to === "elevation") {
        setReviewUrl(res.review_url);
        setStage("elevation");
      } else {
        setStage("interception");
      }
    } catch (e) {
      setErrorMsg((e as Error).message || "Something went wrong.");
      setStage("error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh bg-[#faf7f0] text-[#1f2d24] flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-sm border border-[#e9e2d0] p-6 sm:p-10">
        {stage === "loading" && <p className="text-center text-[#6b7a70]">Loading…</p>}

        {stage === "error" && (
          <div className="text-center space-y-3">
            <ShieldCheck className="w-10 h-10 mx-auto text-[#3f5c48]" />
            <h1 className="text-xl font-serif">Link unavailable</h1>
            <p className="text-sm text-[#6b7a70]">{errorMsg}</p>
          </div>
        )}

        {stage === "rate" && ctx && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-2xl sm:text-3xl font-serif">
                {ctx.contact_first_name ? `Hi ${ctx.contact_first_name} — ` : ""}how did we do?
              </h1>
              <p className="text-[#6b7a70]">
                Your feedback goes straight to the team at {ctx.location_name}.
              </p>
            </div>

            <div
              className="flex items-center justify-center gap-2"
              onMouseLeave={() => setHover(null)}
              role="radiogroup"
              aria-label="Rating"
            >
              {[1, 2, 3, 4, 5].map((n) => {
                const active = (hover ?? rating ?? 0) >= n;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    onMouseEnter={() => setHover(n)}
                    aria-label={`${n} star${n > 1 ? "s" : ""}`}
                    aria-checked={rating === n}
                    role="radio"
                    className="p-2 min-h-[44px] min-w-[44px]"
                  >
                    <Star
                      className={`w-9 h-9 transition ${
                        active ? "fill-[#e0a83a] text-[#e0a83a]" : "text-[#c9c2b0]"
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            <div>
              <label htmlFor="c" className="block text-sm font-medium mb-2">
                Tell us more (optional)
              </label>
              <textarea
                id="c"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                maxLength={2000}
                className="w-full rounded-lg border border-[#d8d1bd] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3f5c48]"
                placeholder="What stood out — good or bad?"
              />
            </div>

            <button
              type="button"
              disabled={!rating || busy}
              onClick={handleSubmit}
              className="w-full rounded-lg bg-[#3f5c48] text-white font-medium py-3 disabled:opacity-50 min-h-[48px]"
            >
              {busy ? "Sending…" : "Send feedback"}
            </button>

            <p className="text-xs text-center text-[#8b978d]">
              Private by default. Your response is shared with management first.
            </p>
          </div>
        )}

        {stage === "interception" && (
          <div className="text-center space-y-4">
            <Heart className="w-10 h-10 mx-auto text-[#3f5c48]" />
            <h1 className="text-2xl font-serif">Thank you — we hear you.</h1>
            <p className="text-[#4a5951]">
              A manager at {ctx?.location_name} will personally review this first thing tomorrow
              morning and reach out to make it right.
            </p>
            <p className="text-sm text-[#6b7a70]">You can close this window.</p>
          </div>
        )}

        {stage === "elevation" && (
          <div className="text-center space-y-5">
            <CheckCircle2 className="w-10 h-10 mx-auto text-[#3f5c48]" />
            <h1 className="text-2xl font-serif">Thank you so much!</h1>
            <p className="text-[#4a5951]">
              Thank you for your input, it means a lot to our team at {ctx?.location_name}.
            </p>

            <div className="space-y-4 pt-2">
              <div className="text-left bg-[#f5efdf] rounded-xl p-4.5 border border-[#e2d8bd] space-y-3">
                <p className="font-semibold text-[#2c3d31] text-sm">
                  Please review us because reviews help small businesses like ours grow!
                </p>
                <p className="text-xs text-[#526357] leading-relaxed">
                  As a token of our appreciation, here is a discount on your next visit:
                </p>
                <div className="bg-white rounded-lg p-3 border border-dashed border-[#3f5c48]/40 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#3f5c48] block">
                      Your Reward Token
                    </span>
                    <span className="font-mono text-base font-bold text-[#1f2d24]">
                      10% Off Next Meal / Visit
                    </span>
                  </div>
                  <span className="bg-[#3f5c48]/10 text-[#3f5c48] text-xs font-bold px-2.5 py-1 rounded font-mono">
                    CODE: THANKYOU10
                  </span>
                </div>
              </div>

              {reviewUrl ? (
                <a
                  href={reviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    trackClick({ data: { token } }).catch(() => {});
                  }}
                  className="inline-flex items-center justify-center gap-2 w-full rounded-lg bg-[#3f5c48] text-white font-medium py-3.5 min-h-[48px] shadow-sm hover:bg-[#324b3a] transition"
                >
                  Leave a 5★ Google Review <ExternalLink className="w-4 h-4" />
                </a>
              ) : (
                <p className="text-xs text-[#6b7a70]">
                  Your discount voucher has been saved to your file!
                </p>
              )}
            </div>
          </div>
        )}

        {stage === "thanks" && (
          <div className="text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 mx-auto text-[#3f5c48]" />
            <h1 className="text-xl font-serif">You&apos;ve already shared your feedback.</h1>
            <p className="text-sm text-[#6b7a70]">Thank you — we&apos;ve got it.</p>
          </div>
        )}
      </div>
    </div>
  );
}
