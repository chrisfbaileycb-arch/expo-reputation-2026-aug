import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  CircleDot,
  Clock,
  CheckCircle2,
  XCircle,
  FileSignature,
  ShieldAlert,
  RefreshCw,
  Star,
  ExternalLink,
} from "lucide-react";

export const Route = createFileRoute("/dashboard/removals")({
  head: () => ({
    meta: [
      { title: "Removal Queue — Expo Proxy Reputation" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RemovalsPage,
});

type RemovalStatus =
  "draft" | "submitted" | "under_review" | "removed" | "denied" | "appeal_pending";

type Violation = {
  id: string;
  review_id: string;
  organization_id: string;
  platform: string;
  policy_code: string;
  policy_title: string;
  policy_url: string | null;
  severity: string;
  ai_rationale: string | null;
  confidence: number | null;
  detected_at: string;
  dismissed: boolean;
  review?: ReviewLite | null;
  removal?: Removal | null;
};

type Removal = {
  id: string;
  review_id: string;
  organization_id: string;
  violation_id: string | null;
  platform: string;
  status: RemovalStatus;
  appeal_body: string;
  submission_url: string | null;
  submitted_at: string | null;
  responded_at: string | null;
  outcome_notes: string | null;
  created_at: string;
  updated_at: string;
  review?: ReviewLite | null;
};

type ReviewLite = {
  id: string;
  author_name: string | null;
  rating: number | null;
  body: string | null;
  platform: string;
  source_url: string | null;
  posted_at: string | null;
};

const PORTAL_URLS: Record<string, string> = {
  google: "https://support.google.com/business/answer/4596773",
  yelp: "https://www.yelp-support.com/article/How-do-I-report-a-review",
  facebook: "https://www.facebook.com/help/contact/265248493786350",
};

const STATUS_META: Record<RemovalStatus, { label: string; tone: string; icon: typeof CircleDot }> =
  {
    draft: { label: "Draft", tone: "muted", icon: FileSignature },
    submitted: { label: "Submitted", tone: "accent", icon: Clock },
    under_review: { label: "Under review", tone: "accent", icon: Clock },
    appeal_pending: { label: "Appeal pending", tone: "accent", icon: Clock },
    removed: { label: "Removed", tone: "primary", icon: CheckCircle2 },
    denied: { label: "Denied", tone: "destructive", icon: XCircle },
  };

function toneClass(tone: string) {
  switch (tone) {
    case "primary":
      return "border-primary/30 bg-primary/5 text-primary";
    case "accent":
      return "border-accent/40 bg-accent/10 text-foreground";
    case "destructive":
      return "border-destructive/30 bg-destructive/5 text-destructive";
    default:
      return "border-border bg-secondary text-muted-foreground";
  }
}

function RemovalsPage() {
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [removals, setRemovals] = useState<Removal[]>([]);
  const [editing, setEditing] = useState<{
    mode: "create" | "update";
    violation?: Violation;
    removal?: Removal;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: roles } = await supabase.from("user_roles").select("organization_id").limit(1);
    const org = roles?.[0]?.organization_id ?? null;
    setOrgId(org);
    if (!org) {
      setLoading(false);
      return;
    }
    const [{ data: vs }, { data: rs }] = await Promise.all([
      supabase
        .from("policy_violations")
        .select("*, review:reviews(id, author_name, rating, body, platform, source_url, posted_at)")
        .eq("organization_id", org)
        .eq("dismissed", false)
        .order("detected_at", { ascending: false }),
      supabase
        .from("removal_requests")
        .select("*, review:reviews(id, author_name, rating, body, platform, source_url, posted_at)")
        .eq("organization_id", org)
        .order("created_at", { ascending: false }),
    ]);
    const removalsByViolation = new Map<string, Removal>();
    (rs ?? []).forEach((r) => {
      const rem = r as unknown as Removal;
      if (rem.violation_id) removalsByViolation.set(rem.violation_id, rem);
    });
    setViolations(
      ((vs ?? []) as unknown as Violation[]).map((v) => ({
        ...v,
        removal: removalsByViolation.get(v.id) ?? null,
      })),
    );
    setRemovals((rs ?? []) as unknown as Removal[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const metrics = useMemo(() => {
    const open = violations.filter((v) => !v.removal).length;
    const inReview = removals.filter(
      (r) =>
        r.status === "submitted" || r.status === "under_review" || r.status === "appeal_pending",
    ).length;
    const removed = removals.filter((r) => r.status === "removed").length;
    const denied = removals.filter((r) => r.status === "denied").length;
    return { open, inReview, removed, denied };
  }, [violations, removals]);

  return (
    <div className="p-8 max-w-7xl">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">Removal queue</h1>
          <p className="text-muted-foreground mt-1">
            Live pipeline of policy-violating reviews and their removal status across Google, Yelp,
            and Facebook.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()}>
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <Metric label="Open" value={metrics.open} />
        <Metric label="In review" value={metrics.inReview} highlight />
        <Metric label="Removed" value={metrics.removed} highlight />
        <Metric label="Denied" value={metrics.denied} />
      </div>

      {!orgId && !loading && (
        <Card className="p-8 text-center border-dashed">
          <h2 className="font-display text-xl font-semibold mb-2">No organization yet</h2>
          <p className="text-muted-foreground text-sm">
            Create an organization in Settings to begin tracking removals.
          </p>
        </Card>
      )}

      {loading ? (
        <Card className="p-8 text-center text-muted-foreground">Loading…</Card>
      ) : (
        <>
          <SectionTitle>Flagged — awaiting action</SectionTitle>
          {violations.filter((v) => !v.removal).length === 0 ? (
            <EmptyRow text="No open violations. New flags from the policy scanner will appear here." />
          ) : (
            <div className="space-y-2 mb-10">
              {violations
                .filter((v) => !v.removal)
                .map((v) => (
                  <ViolationRow
                    key={v.id}
                    violation={v}
                    onCreate={() => setEditing({ mode: "create", violation: v })}
                    onDismiss={async () => {
                      const { error } = await supabase
                        .from("policy_violations")
                        .update({ dismissed: true, dismissed_reason: "Operator dismissed" })
                        .eq("id", v.id);
                      if (error) toast.error(error.message);
                      else {
                        toast.success("Violation dismissed");
                        void load();
                      }
                    }}
                  />
                ))}
            </div>
          )}

          <SectionTitle>Removal pipeline</SectionTitle>
          {removals.length === 0 ? (
            <EmptyRow text="No removal requests filed yet. Create one from a flagged violation above." />
          ) : (
            <div className="space-y-2">
              {removals.map((r) => (
                <RemovalRow
                  key={r.id}
                  removal={r}
                  onEdit={() => setEditing({ mode: "update", removal: r })}
                  onStatus={async (status) => {
                    const patch: {
                      status: RemovalStatus;
                      submitted_at?: string;
                      responded_at?: string;
                    } = { status };
                    if (status === "submitted" && !r.submitted_at) {
                      patch.submitted_at = new Date().toISOString();
                    }
                    if (status === "removed" || status === "denied") {
                      patch.responded_at = new Date().toISOString();
                    }
                    const { error } = await supabase
                      .from("removal_requests")
                      .update(patch)
                      .eq("id", r.id);
                    if (error) toast.error(error.message);
                    else {
                      toast.success(`Marked ${STATUS_META[status].label.toLowerCase()}`);
                      void load();
                    }
                  }}
                />
              ))}
            </div>
          )}
        </>
      )}

      <EditorDialog
        open={!!editing}
        onClose={() => setEditing(null)}
        state={editing}
        orgId={orgId}
        onSaved={() => {
          setEditing(null);
          void load();
        }}
      />
    </div>
  );
}

function Metric({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <Card className={`p-5 ${highlight ? "border-primary/30 bg-primary/5" : ""}`}>
      <div className={`font-display text-3xl font-semibold ${highlight ? "text-primary" : ""}`}>
        {value}
      </div>
      <div className="text-xs uppercase tracking-widest text-muted-foreground mt-1">{label}</div>
    </Card>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display text-sm uppercase tracking-widest text-muted-foreground mb-3">
      {children}
    </h2>
  );
}

function EmptyRow({ text }: { text: string }) {
  return <Card className="p-6 text-sm text-muted-foreground border-dashed mb-10">{text}</Card>;
}

function ReviewSummary({ review, platform }: { review?: ReviewLite | null; platform: string }) {
  if (!review) {
    return <span className="text-xs text-muted-foreground">Review record unavailable</span>;
  }
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium truncate">{review.author_name ?? "Anonymous"}</span>
        <span className="flex items-center gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`w-3 h-3 ${
                review.rating && i < review.rating ? "fill-accent text-accent" : "text-border"
              }`}
            />
          ))}
        </span>
        <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
          {platform}
        </Badge>
      </div>
      {review.body && (
        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{review.body}</p>
      )}
    </div>
  );
}

function ViolationRow({
  violation,
  onCreate,
  onDismiss,
}: {
  violation: Violation;
  onCreate: () => void;
  onDismiss: () => void;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-4">
        <div
          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${toneClass(
            "muted",
          )}`}
        >
          <ShieldAlert className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <ReviewSummary review={violation.review} platform={violation.platform} />
          <div className="mt-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{violation.policy_title}</span>
            {" · "}
            <span className="uppercase tracking-wider">{violation.severity}</span>
            {violation.confidence != null && (
              <>
                {" "}
                {" · "} {Math.round(Number(violation.confidence) * 100)}% confidence
              </>
            )}
          </div>
          {violation.ai_rationale && (
            <p className="text-xs text-muted-foreground mt-1 italic">{violation.ai_rationale}</p>
          )}
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          <Button size="sm" onClick={onCreate}>
            Create removal request
          </Button>
          <Button size="sm" variant="ghost" onClick={onDismiss}>
            Dismiss
          </Button>
        </div>
      </div>
    </Card>
  );
}

function RemovalRow({
  removal,
  onEdit,
  onStatus,
}: {
  removal: Removal;
  onEdit: () => void;
  onStatus: (s: RemovalStatus) => void;
}) {
  const meta = STATUS_META[removal.status];
  const Icon = meta.icon;
  const portal = PORTAL_URLS[removal.platform];
  return (
    <Card className="p-4">
      <div className="flex items-start gap-4">
        <div
          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${toneClass(
            meta.tone,
          )}`}
        >
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${toneClass(meta.tone)}`}
            >
              {meta.label}
            </span>
            <ReviewSummary review={removal.review} platform={removal.platform} />
          </div>
          {removal.submitted_at && (
            <div className="text-xs text-muted-foreground mt-2">
              Submitted {new Date(removal.submitted_at).toLocaleDateString()}
              {removal.responded_at && (
                <> · Responded {new Date(removal.responded_at).toLocaleDateString()}</>
              )}
            </div>
          )}
          {removal.outcome_notes && (
            <p className="text-xs text-muted-foreground mt-1 italic">{removal.outcome_notes}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          {portal && (
            <a
              href={portal}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-primary hover:underline inline-flex items-center gap-1"
            >
              Open {removal.platform} portal <ExternalLink className="w-3 h-3" />
            </a>
          )}
          <div className="flex flex-wrap justify-end gap-1">
            <Button size="sm" variant="outline" onClick={onEdit}>
              Edit
            </Button>
            {removal.status === "draft" && (
              <Button size="sm" onClick={() => onStatus("submitted")}>
                Mark submitted
              </Button>
            )}
            {(removal.status === "submitted" ||
              removal.status === "under_review" ||
              removal.status === "appeal_pending") && (
              <>
                <Button size="sm" variant="default" onClick={() => onStatus("removed")}>
                  Removed
                </Button>
                <Button size="sm" variant="destructive" onClick={() => onStatus("denied")}>
                  Denied
                </Button>
              </>
            )}
            {removal.status === "denied" && (
              <Button size="sm" variant="outline" onClick={() => onStatus("appeal_pending")}>
                File appeal
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function EditorDialog({
  open,
  onClose,
  state,
  orgId,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  state: { mode: "create" | "update"; violation?: Violation; removal?: Removal } | null;
  orgId: string | null;
  onSaved: () => void;
}) {
  const [body, setBody] = useState("");
  const [submissionUrl, setSubmissionUrl] = useState("");
  const [outcomeNotes, setOutcomeNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!state) return;
    if (state.mode === "create" && state.violation) {
      const v = state.violation;
      setBody(
        `Hello ${v.platform} Support team,\n\nWe are requesting removal of the review referenced below. It appears to violate the "${v.policy_title}" policy (${v.policy_code}).\n\nRationale: ${v.ai_rationale ?? "See review content."}\n\nPlease review and remove per platform guidelines. Thank you.`,
      );
      setSubmissionUrl("");
      setOutcomeNotes("");
    } else if (state.mode === "update" && state.removal) {
      setBody(state.removal.appeal_body ?? "");
      setSubmissionUrl(state.removal.submission_url ?? "");
      setOutcomeNotes(state.removal.outcome_notes ?? "");
    }
  }, [state]);

  if (!state) return null;

  const handleSave = async () => {
    if (!orgId) return;
    setSaving(true);
    if (state.mode === "create" && state.violation) {
      const v = state.violation;
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from("removal_requests").insert({
        review_id: v.review_id,
        organization_id: v.organization_id,
        violation_id: v.id,
        platform: v.platform as "google" | "yelp" | "facebook" | "manual" | "other",
        status: "draft" as RemovalStatus,
        appeal_body: body,
        submission_url: submissionUrl || null,
        submitted_by: userData.user?.id ?? null,
      });
      if (error) toast.error(error.message);
      else toast.success("Removal request drafted");
    } else if (state.mode === "update" && state.removal) {
      const { error } = await supabase
        .from("removal_requests")
        .update({
          appeal_body: body,
          submission_url: submissionUrl || null,
          outcome_notes: outcomeNotes || null,
        })
        .eq("id", state.removal.id);
      if (error) toast.error(error.message);
      else toast.success("Removal request updated");
    }
    setSaving(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {state.mode === "create" ? "Draft removal request" : "Edit removal request"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Appeal body
            </label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Submission URL (after filing through the platform portal)
            </label>
            <Input
              value={submissionUrl}
              onChange={(e) => setSubmissionUrl(e.target.value)}
              placeholder="https://…"
              className="mt-1"
            />
          </div>
          {state.mode === "update" && (
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Outcome notes
              </label>
              <Textarea
                value={outcomeNotes}
                onChange={(e) => setOutcomeNotes(e.target.value)}
                rows={3}
                className="mt-1"
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !body.trim()}>
            {saving ? "Saving…" : state.mode === "create" ? "Create draft" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
