import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { approveDraft, rejectDraft, markDraftPosted } from "@/lib/drafts.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Loader2,
  Star,
  CheckCircle2,
  XCircle,
  Clock,
  Copy,
  ExternalLink,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/dashboard/approvals")({
  head: () => ({
    meta: [
      { title: "Approval Queue — Expo Proxy Reputation" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ApprovalsPage,
});

type DraftRow = {
  id: string;
  platform: string;
  draft_body: string;
  status: string;
  scheduled_post_at: string | null;
  posted_at: string | null;
  created_at: string;
  review: {
    id: string;
    author_name: string | null;
    rating: number | null;
    body: string | null;
    platform: string;
    posted_at: string | null;
    source_url: string | null;
  } | null;
};

const STATUS_LABEL: Record<
  string,
  { label: string; tone: "default" | "secondary" | "destructive" | "outline" }
> = {
  pending_approval: { label: "Needs approval", tone: "default" },
  auto_approved: { label: "Auto-approved", tone: "secondary" },
  approved: { label: "Approved", tone: "secondary" },
  copy_for_yelp: { label: "Yelp — copy & paste", tone: "outline" },
  posted: { label: "Posted", tone: "secondary" },
  rejected: { label: "Rejected", tone: "destructive" },
};

function ApprovalsPage() {
  const approve = useServerFn(approveDraft);
  const reject = useServerFn(rejectDraft);
  const markPosted = useServerFn(markDraftPosted);

  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const { data, error } = await supabase
      .from("response_drafts")
      .select(
        "id, platform, draft_body, status, scheduled_post_at, posted_at, created_at, review:reviews(id, author_name, rating, body, platform, posted_at, source_url)",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) toast.error(error.message);
    setDrafts((data as unknown as DraftRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const buckets = {
    pending: drafts.filter((d) => d.status === "pending_approval"),
    auto: drafts.filter((d) => d.status === "auto_approved" || d.status === "approved"),
    yelp: drafts.filter((d) => d.status === "copy_for_yelp"),
    done: drafts.filter((d) => d.status === "posted" || d.status === "rejected"),
  };

  const handleApprove = async (d: DraftRow) => {
    setBusy(d.id);
    try {
      const edited = edits[d.id];
      await approve({ data: { draft_id: d.id, edited_body: edited } });
      toast.success("Approved. Will post on Google/Facebook once OAuth is connected.");
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const handleReject = async (d: DraftRow) => {
    setBusy(d.id);
    try {
      await reject({ data: { draft_id: d.id } });
      toast.success("Draft rejected");
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const handleCopyForYelp = async (d: DraftRow) => {
    const text = edits[d.id] ?? d.draft_body;
    await navigator.clipboard.writeText(text);
    if (d.review?.source_url) window.open(d.review.source_url, "_blank", "noopener");
    setBusy(d.id);
    try {
      await markPosted({ data: { draft_id: d.id } });
      toast.success("Copied. Marked as posted.");
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const handleMarkPosted = async (d: DraftRow) => {
    setBusy(d.id);
    try {
      await markPosted({ data: { draft_id: d.id } });
      toast.success("Marked as posted");
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-muted-foreground flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading…
      </div>
    );
  }

  const renderDraft = (d: DraftRow) => {
    const r = d.review;
    const status = STATUS_LABEL[d.status] ?? { label: d.status, tone: "outline" as const };
    const editedValue = edits[d.id] ?? d.draft_body;
    return (
      <Card key={d.id} className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge variant="outline" className="capitalize">
                {d.platform}
              </Badge>
              {r?.rating != null && (
                <span className="flex items-center text-sm text-muted-foreground">
                  <Star className="w-3.5 h-3.5 fill-current mr-0.5" />
                  {r.rating}
                </span>
              )}
              <span className="text-xs text-muted-foreground">{r?.author_name ?? "Anonymous"}</span>
              {d.scheduled_post_at && d.status === "auto_approved" && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Auto-posts {new Date(d.scheduled_post_at).toLocaleString()}
                </span>
              )}
              <Badge variant={status.tone} className="ml-auto">
                {status.label}
              </Badge>
            </div>
            {r?.body && (
              <p className="text-sm text-foreground/80 italic border-l-2 border-border pl-3 mt-2">
                "{r.body}"
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Sparkles className="w-3 h-3" /> AI-drafted reply — edit before approving
          </div>
          <Textarea
            rows={4}
            value={editedValue}
            disabled={d.status === "posted" || d.status === "rejected"}
            onChange={(e) => setEdits((s) => ({ ...s, [d.id]: e.target.value }))}
          />
        </div>

        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {d.status === "pending_approval" && (
            <>
              <Button size="sm" onClick={() => handleApprove(d)} disabled={busy === d.id}>
                {busy === d.id ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                )}
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleReject(d)}
                disabled={busy === d.id}
              >
                <XCircle className="w-3.5 h-3.5 mr-1.5" /> Reject
              </Button>
            </>
          )}
          {d.status === "auto_approved" && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleReject(d)}
                disabled={busy === d.id}
              >
                <XCircle className="w-3.5 h-3.5 mr-1.5" /> Cancel auto-post
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleMarkPosted(d)}
                disabled={busy === d.id}
              >
                Mark posted manually
              </Button>
            </>
          )}
          {d.status === "copy_for_yelp" && (
            <Button size="sm" onClick={() => handleCopyForYelp(d)} disabled={busy === d.id}>
              <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy & open Yelp
              {r?.source_url && <ExternalLink className="w-3 h-3 ml-1.5 opacity-60" />}
            </Button>
          )}
          {d.status === "approved" && (
            <Button size="sm" onClick={() => handleMarkPosted(d)} disabled={busy === d.id}>
              Mark posted
            </Button>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold">Approval Queue</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          AI-drafted replies. 4★+ on Google/Facebook auto-post after a brief delay. 3★ and below
          wait for your approval. Yelp is always one-tap copy because Yelp has no public reply API.
        </p>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Needs approval{" "}
            <Badge variant="secondary" className="ml-2">
              {buckets.pending.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="auto">
            Auto-posting{" "}
            <Badge variant="secondary" className="ml-2">
              {buckets.auto.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="yelp">
            Yelp queue{" "}
            <Badge variant="secondary" className="ml-2">
              {buckets.yelp.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="done">
            History{" "}
            <Badge variant="secondary" className="ml-2">
              {buckets.done.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-3 pt-4">
          {buckets.pending.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground border-dashed">
              Nothing waiting on you. Low-rating reviews show up here.
            </Card>
          ) : (
            buckets.pending.map(renderDraft)
          )}
        </TabsContent>
        <TabsContent value="auto" className="space-y-3 pt-4">
          {buckets.auto.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground border-dashed">
              No auto-posts queued. 4★+ Google/Facebook reviews land here.
            </Card>
          ) : (
            buckets.auto.map(renderDraft)
          )}
        </TabsContent>
        <TabsContent value="yelp" className="space-y-3 pt-4">
          {buckets.yelp.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground border-dashed">
              No Yelp drafts. They appear here because Yelp doesn't expose a reply API.
            </Card>
          ) : (
            buckets.yelp.map(renderDraft)
          )}
        </TabsContent>
        <TabsContent value="done" className="space-y-3 pt-4">
          {buckets.done.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground border-dashed">
              Posted and rejected replies will live here.
            </Card>
          ) : (
            buckets.done.map(renderDraft)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
