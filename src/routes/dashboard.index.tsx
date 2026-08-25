import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Inbox,
  ShieldAlert,
  Star,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  Link2,
  Send,
  AlertCircle,
  RefreshCw,
  Loader2,
} from "lucide-react";

export const Route = createFileRoute("/dashboard/")({
  component: Overview,
});

type Stats = {
  avgRating: number | null;
  newReviews: number;
  flaggedOpen: number;
  removed: number;
};

function Overview() {
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasOrg, setHasOrg] = useState(false);
  const [stats, setStats] = useState<Stats>({
    avgRating: null,
    newReviews: 0,
    flaggedOpen: 0,
    removed: 0,
  });

  const loadStats = useCallback(async (isRetry = false) => {
    if (isRetry) setRetrying(true);
    else setLoading(true);
    setError(null);
    try {
      const { data: roles, error: rolesErr } = await supabase
        .from("user_roles")
        .select("organization_id")
        .limit(1);
      if (rolesErr) throw rolesErr;
      const orgId = roles?.[0]?.organization_id;
      if (!orgId) {
        setHasOrg(false);
        return;
      }
      setHasOrg(true);
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400 * 1000).toISOString();
      const [reviewsAgg, newReviewsRes, openViolations, removedReqs] = await Promise.all([
        supabase.from("reviews").select("rating").eq("organization_id", orgId),
        supabase
          .from("reviews")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", orgId)
          .gte("posted_at", sevenDaysAgo),
        supabase
          .from("policy_violations")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", orgId)
          .eq("dismissed", false),
        supabase
          .from("removal_requests")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", orgId)
          .eq("status", "removed"),
      ]);
      const firstErr =
        reviewsAgg.error ?? newReviewsRes.error ?? openViolations.error ?? removedReqs.error;
      if (firstErr) throw firstErr;

      const ratings = (reviewsAgg.data ?? [])
        .map((r) => r.rating)
        .filter((r): r is number => typeof r === "number");
      const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
      setStats({
        avgRating: avg,
        newReviews: newReviewsRes.count ?? 0,
        flaggedOpen: openViolations.count ?? 0,
        removed: removedReqs.count ?? 0,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Something went wrong loading your metrics.";
      setError(message);
    } finally {
      setLoading(false);
      setRetrying(false);
    }
  }, []);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const cards = [
    {
      label: "Average rating",
      value: stats.avgRating != null ? stats.avgRating.toFixed(2) : "—",
      icon: Star,
      hint: "Across all locations",
    },
    {
      label: "New reviews (7d)",
      value: String(stats.newReviews),
      icon: Inbox,
      hint: "From the last 7 days",
    },
    {
      label: "Flagged for removal",
      value: String(stats.flaggedOpen),
      icon: ShieldAlert,
      hint: "Open policy violations",
    },
    {
      label: "Removed this period",
      value: String(stats.removed),
      icon: CheckCircle2,
      hint: "Removal requests granted",
    },
  ];

  return (
    <div className="p-8 max-w-7xl">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">Overview</h1>
          <p className="text-muted-foreground mt-1">Your reputation at a glance.</p>
        </div>
        <Link to="/dashboard/removals">
          <Button variant="outline" size="sm">
            Open removal queue <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>

      {error ? (
        <Card className="p-8 mb-8 border-destructive/30 bg-destructive/5">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <h2 className="font-display text-lg font-semibold mb-1">
                We couldn't load your metrics
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                {error}. This is usually a temporary network hiccup — try again in a moment.
              </p>
              <Button size="sm" onClick={() => void loadStats(true)} disabled={retrying}>
                {retrying ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" aria-hidden="true" />
                )}
                {retrying ? "Retrying…" : "Try again"}
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
          aria-busy={loading}
        >
          {cards.map(({ label, value, icon: Icon, hint }) => (
            <Card key={label} className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">{label}</span>
                <Icon className="w-4 h-4 text-primary" aria-hidden="true" />
              </div>
              {loading ? (
                <>
                  <Skeleton className="h-9 w-20 mb-2" />
                  <Skeleton className="h-3 w-32" />
                </>
              ) : (
                <>
                  <div className="font-display text-3xl font-semibold">{value}</div>
                  <div className="text-xs text-muted-foreground mt-1">{hint}</div>
                </>
              )}
            </Card>
          ))}
        </div>
      )}

      {!loading && !error && !hasOrg && (
        <Card className="p-8 text-center border-dashed">
          <h2 className="font-display text-xl font-semibold mb-2">No organization yet</h2>
          <p className="text-muted-foreground text-sm mb-4 max-w-md mx-auto">
            Create your organization in the Review Inbox to start importing reviews and tracking
            removals.
          </p>
          <Link to="/dashboard/inbox">
            <Button size="sm">
              Get started <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </Card>
      )}

      {!loading &&
        !error &&
        hasOrg &&
        stats.newReviews === 0 &&
        stats.flaggedOpen === 0 &&
        stats.removed === 0 &&
        stats.avgRating == null && (
          <Card className="p-8 border-dashed">
            <div className="flex items-start gap-3 mb-5">
              <TrendingUp className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <h2 className="font-display text-xl font-semibold">
                  Your dashboard is ready — let's fill it in
                </h2>
                <p className="text-muted-foreground text-sm mt-1">
                  A few quick steps and the metrics above will start telling your reputation story.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <NextStep
                to="/dashboard/inbox"
                icon={Inbox}
                title="Import your first reviews"
                body="Paste a single review or a JSON batch. The AI scanner flags anything that violates platform policy."
                cta="Open Review Inbox"
              />
              <NextStep
                to="/dashboard/connections"
                icon={Link2}
                title="Connect Google Business"
                body="Link your GBP locations so approved replies auto-post — no copy/paste for 4★+ Google reviews."
                cta="Manage connections"
              />
              <NextStep
                to="/dashboard/campaigns"
                icon={Send}
                title="Launch a request campaign"
                body="Send SMS or email review requests to recent customers to lift your rating."
                cta="Set up campaign"
              />
            </div>
          </Card>
        )}
    </div>
  );
}

function NextStep({
  to,
  icon: Icon,
  title,
  body,
  cta,
}: {
  to: string;
  icon: typeof Inbox;
  title: string;
  body: string;
  cta: string;
}) {
  return (
    <Link to={to} className="group">
      <Card className="p-4 h-full hover:border-primary/40 transition-colors">
        <Icon className="w-4 h-4 text-primary mb-2" />
        <div className="font-medium text-sm mb-1">{title}</div>
        <p className="text-xs text-muted-foreground mb-3">{body}</p>
        <span className="text-xs text-primary inline-flex items-center gap-1 group-hover:gap-1.5 transition-all">
          {cta} <ArrowRight className="w-3 h-3" />
        </span>
      </Card>
    </Link>
  );
}
