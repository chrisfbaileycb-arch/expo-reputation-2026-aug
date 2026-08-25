import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  Circle,
  AlertCircle,
  Loader2,
  CreditCard,
  ShieldCheck,
  FileCheck2,
  Beaker,
} from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { simulateSubscriptionEvent, reprocessWebhookEvent } from "@/lib/stripe-test.functions";
import { RefreshCw } from "lucide-react";

export const Route = createFileRoute("/dashboard/stripe-readiness")({
  head: () => ({
    meta: [
      { title: "Stripe Readiness — Expo Proxy Reputation" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StripeReadinessPage,
});

type ChecklistItem = { key: string; label: string; done: boolean };

type Readiness = {
  organization_id: string;
  eligibility_status: string;
  eligibility_checked_at: string | null;
  eligibility_notes: string | null;
  payments_enabled: boolean;
  payments_enabled_at: string | null;
  last_price_batch_at: string | null;
  last_price_batch_result: unknown;
  webhook_enforcement_active: boolean;
  webhook_last_event_at: string | null;
  webhook_notes: string | null;
  llc_checklist: ChecklistItem[];
};

const ELIGIBILITY_OPTIONS = [
  { value: "not_run", label: "Not run yet" },
  { value: "eligible", label: "Eligible — Stripe recommended" },
  { value: "eligible_with_review", label: "Eligible (needs review)" },
  { value: "ineligible", label: "Ineligible" },
  { value: "failed", label: "Check failed" },
];

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { key: "wy_articles", label: "Wyoming Articles of Organization filed", done: false },
  { key: "wy_approved", label: "Wyoming Secretary of State approval received", done: false },
  { key: "ein_applied", label: "IRS EIN application submitted (SS-4)", done: false },
  { key: "ein_issued", label: "EIN issued by IRS", done: false },
  {
    key: "operating_agreement",
    label: "Operating Agreement signed (Signal F Holdings LLC)",
    done: false,
  },
  { key: "registered_agent", label: "Wyoming registered agent confirmed", done: false },
  { key: "bank_account", label: "Business bank account opened in LLC name", done: false },
  { key: "dba_filed", label: 'DBA "Expo Proxy Reputation" filed (if used)', done: false },
  { key: "address_verified", label: "Verifiable business address on file", done: false },
  { key: "beneficial_ownership", label: "FinCEN Beneficial Ownership Report filed", done: false },
];

function StripeReadinessPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [state, setState] = useState<Readiness | null>(null);

  useEffect(() => {
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      const uid = session.session?.user.id;
      if (!uid) return;
      const { data: role } = await supabase
        .from("user_roles")
        .select("organization_id")
        .eq("user_id", uid)
        .in("role", ["owner", "admin"])
        .limit(1)
        .maybeSingle();
      const oid = role?.organization_id ?? null;
      setOrgId(oid);
      if (!oid) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("stripe_readiness")
        .select("*")
        .eq("organization_id", oid)
        .maybeSingle();
      setState(
        (data as Readiness | null) ?? {
          organization_id: oid,
          eligibility_status: "not_run",
          eligibility_checked_at: null,
          eligibility_notes: null,
          payments_enabled: false,
          payments_enabled_at: null,
          last_price_batch_at: null,
          last_price_batch_result: {},
          webhook_enforcement_active: false,
          webhook_last_event_at: null,
          webhook_notes: null,
          llc_checklist: DEFAULT_CHECKLIST,
        },
      );
      setLoading(false);
    })();
  }, []);

  async function save(next: Partial<Readiness>) {
    if (!state || !orgId) return;
    setSaving(true);
    const merged = { ...state, ...next, organization_id: orgId };
    const { error } = await supabase
      .from("stripe_readiness")
      .upsert(merged as never, { onConflict: "organization_id" });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setState(merged);
    toast.success("Saved");
  }

  function toggleChecklist(key: string) {
    if (!state) return;
    const next = state.llc_checklist.map((i) => (i.key === key ? { ...i, done: !i.done } : i));
    save({ llc_checklist: next });
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading readiness state…
      </div>
    );
  }

  if (!orgId || !state) {
    return (
      <div className="p-8">
        <Card>
          <CardHeader>
            <CardTitle>No organization access</CardTitle>
            <CardDescription>
              You need owner or admin role on an organization to view Stripe readiness.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const checklistDone = state.llc_checklist.filter((i) => i.done).length;
  const checklistTotal = state.llc_checklist.length;
  const allChecklistDone = checklistDone === checklistTotal;
  const goLiveBlocked =
    !allChecklistDone ||
    state.eligibility_status === "not_run" ||
    state.eligibility_status === "ineligible";

  return (
    <div className="p-8 max-w-5xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Stripe Readiness</h1>
        <p className="text-muted-foreground mt-1">
          Internal admin view. Track everything that must be true before we enable Stripe payments
          on this org.
        </p>
      </div>

      {/* Status row */}
      <div className="grid md:grid-cols-3 gap-4">
        <StatusCard
          icon={ShieldCheck}
          label="Eligibility"
          value={
            ELIGIBILITY_OPTIONS.find((o) => o.value === state.eligibility_status)?.label ??
            state.eligibility_status
          }
          tone={
            state.eligibility_status === "eligible"
              ? "good"
              : state.eligibility_status === "ineligible" || state.eligibility_status === "failed"
                ? "bad"
                : "neutral"
          }
          sub={
            state.eligibility_checked_at
              ? `Checked ${new Date(state.eligibility_checked_at).toLocaleString()}`
              : "Never run"
          }
        />
        <StatusCard
          icon={CreditCard}
          label="Payments enabled"
          value={state.payments_enabled ? "Live" : "Not enabled"}
          tone={state.payments_enabled ? "good" : "neutral"}
          sub={
            state.payments_enabled_at
              ? new Date(state.payments_enabled_at).toLocaleString()
              : "Awaiting LLC + EIN"
          }
        />
        <StatusCard
          icon={FileCheck2}
          label="Webhook enforcement"
          value={state.webhook_enforcement_active ? "Active" : "Inactive"}
          tone={state.webhook_enforcement_active ? "good" : "neutral"}
          sub={
            state.webhook_last_event_at
              ? `Last event ${new Date(state.webhook_last_event_at).toLocaleString()}`
              : "No events yet"
          }
        />
      </div>

      {/* Go-live gate */}
      <Card className={goLiveBlocked ? "border-amber-500/40" : "border-emerald-500/40"}>
        <CardHeader className="flex flex-row items-center gap-3">
          {goLiveBlocked ? (
            <AlertCircle className="w-5 h-5 text-amber-500" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          )}
          <div>
            <CardTitle className="text-base">
              {goLiveBlocked ? "Not ready to enable Stripe" : "Ready to enable Stripe"}
            </CardTitle>
            <CardDescription>
              {goLiveBlocked
                ? "Complete every checklist item and run an eligibility check before enabling payments."
                : "Checklist complete and eligibility confirmed. Run the enable flow when you're ready."}
            </CardDescription>
          </div>
        </CardHeader>
      </Card>

      {/* LLC checklist */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>LLC prerequisite checklist</CardTitle>
              <CardDescription>
                Signal F Holdings LLC — Wyoming. Everything Stripe will ask for during onboarding.
              </CardDescription>
            </div>
            <Badge variant={allChecklistDone ? "default" : "secondary"}>
              {checklistDone} / {checklistTotal}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {state.llc_checklist.map((item) => (
            <label
              key={item.key}
              className="flex items-center gap-3 rounded-md border border-border/40 px-3 py-2 cursor-pointer hover:bg-accent/30"
            >
              <Checkbox
                checked={item.done}
                onCheckedChange={() => toggleChecklist(item.key)}
                disabled={saving}
              />
              <span className={item.done ? "text-muted-foreground line-through" : ""}>
                {item.label}
              </span>
              {item.done ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto" />
              ) : (
                <Circle className="w-4 h-4 text-muted-foreground/40 ml-auto" />
              )}
            </label>
          ))}
        </CardContent>
      </Card>

      {/* Eligibility */}
      <Card>
        <CardHeader>
          <CardTitle>Eligibility status</CardTitle>
          <CardDescription>
            Result of the payments eligibility check (`recommend_payment_provider`).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={state.eligibility_status}
                onValueChange={(v) =>
                  save({ eligibility_status: v, eligibility_checked_at: new Date().toISOString() })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ELIGIBILITY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Last checked</Label>
              <div className="text-sm text-muted-foreground py-2">
                {state.eligibility_checked_at
                  ? new Date(state.eligibility_checked_at).toLocaleString()
                  : "Never"}
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              rows={3}
              value={state.eligibility_notes ?? ""}
              onChange={(e) => setState({ ...state, eligibility_notes: e.target.value })}
              onBlur={() => save({ eligibility_notes: state.eligibility_notes })}
              placeholder="Provider recommendation, restrictions, follow-ups…"
            />
          </div>
        </CardContent>
      </Card>

      {/* Payments + price batch */}
      <Card>
        <CardHeader>
          <CardTitle>Payments + price batch</CardTitle>
          <CardDescription>
            Set once Stripe is enabled and prices have been created.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-md border border-border/40 px-3 py-3">
            <div>
              <div className="font-medium text-sm">Payments enabled</div>
              <div className="text-xs text-muted-foreground">
                Toggle once `enable_stripe_payments` has completed successfully.
              </div>
            </div>
            <Switch
              checked={state.payments_enabled}
              onCheckedChange={(v) =>
                save({
                  payments_enabled: v,
                  payments_enabled_at: v ? new Date().toISOString() : null,
                })
              }
            />
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Last price-batch result
            </Label>
            <div className="mt-2 rounded-md border border-border/40 bg-muted/30 p-3">
              <div className="text-xs text-muted-foreground mb-2">
                {state.last_price_batch_at
                  ? `Created ${new Date(state.last_price_batch_at).toLocaleString()}`
                  : "No batch created yet — 6 price IDs (Starter, Growth, Pro × monthly/annual) will land here."}
              </div>
              <pre className="text-xs overflow-auto max-h-64 whitespace-pre-wrap">
                {JSON.stringify(state.last_price_batch_result ?? {}, null, 2)}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Webhook enforcement */}
      <Card>
        <CardHeader>
          <CardTitle>Webhook enforcement (12-month term)</CardTitle>
          <CardDescription>
            Tracks the `customer.subscription.updated` handler that generates the 50%
            early-termination invoice when `cancel_at_period_end=true` arrives before
            `contract_ends_at`.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-md border border-border/40 px-3 py-3">
            <div>
              <div className="font-medium text-sm">Enforcement active</div>
              <div className="text-xs text-muted-foreground">
                Toggle on once the webhook is deployed and signature-verified.
              </div>
            </div>
            <Switch
              checked={state.webhook_enforcement_active}
              onCheckedChange={(v) => save({ webhook_enforcement_active: v })}
            />
          </div>
          <div className="space-y-2">
            <Label>Webhook notes</Label>
            <Textarea
              rows={5}
              value={state.webhook_notes ?? ""}
              onChange={(e) => setState({ ...state, webhook_notes: e.target.value })}
              onBlur={() => save({ webhook_notes: state.webhook_notes })}
              placeholder="Endpoint URL, last test result, signing secret rotation date…"
            />
          </div>

          <WebhookSimulator
            orgId={orgId}
            onCompleted={async () => {
              const { data } = await supabase
                .from("stripe_readiness")
                .select("*")
                .eq("organization_id", orgId)
                .maybeSingle();
              if (data) setState(data as unknown as Readiness);
            }}
          />
        </CardContent>
      </Card>

      <WebhookEventHistory orgId={orgId} />
    </div>
  );
}

type WebhookEventRow = {
  id: string;
  event_id: string | null;
  event_type: string;
  simulated: boolean;
  livemode: boolean | null;
  action: string;
  ok: boolean;
  note: string | null;
  subscription_id: string | null;
  cancel_at_period_end: boolean | null;
  contract_ends_at: string | null;
  payload: unknown;
  received_at: string;
};

function WebhookEventHistory({ orgId }: { orgId: string }) {
  const reprocess = useServerFn(reprocessWebhookEvent);
  const [rows, setRows] = useState<WebhookEventRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [reprocessingId, setReprocessingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("stripe_webhook_events")
      .select("*")
      .eq("organization_id", orgId)
      .order("received_at", { ascending: false })
      .limit(50);
    if (error) toast.error(error.message);
    setRows((data as WebhookEventRow[] | null) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`stripe_webhook_events:${orgId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "stripe_webhook_events",
          filter: `organization_id=eq.${orgId}`,
        },
        (payload) =>
          setRows((prev) => [payload.new as WebhookEventRow, ...(prev ?? [])].slice(0, 50)),
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "stripe_webhook_events",
          filter: `organization_id=eq.${orgId}`,
        },
        (payload) =>
          setRows((prev) =>
            (prev ?? []).map((r) =>
              r.id === (payload.new as WebhookEventRow).id ? (payload.new as WebhookEventRow) : r,
            ),
          ),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  async function handleReprocess(rowId: string) {
    setReprocessingId(rowId);
    try {
      const res = await reprocess({ data: { event_row_id: rowId } });
      const r = res as { ok: boolean; action: string; note: string };
      if (r.ok) toast.success(`Reprocessed: ${r.action}`);
      else toast.error(r.note);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reprocess failed");
    } finally {
      setReprocessingId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>Webhook event history</CardTitle>
            <CardDescription>
              Last 50 simulated and live `customer.subscription.updated` deliveries, newest first.
              Live updates as events arrive.
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Refresh"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {rows && rows.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center border border-dashed rounded-md">
            No events yet. Fire a test event above to populate this log.
          </div>
        ) : (
          <div className="divide-y divide-border/40 rounded-md border border-border/40">
            {(rows ?? []).map((r) => {
              const isOpen = expanded === r.id;
              return (
                <div key={r.id} className="px-3 py-2 text-sm">
                  <button
                    type="button"
                    className="w-full flex items-center gap-3 text-left"
                    onClick={() => setExpanded(isOpen ? null : r.id)}
                  >
                    <Badge variant={r.simulated ? "secondary" : "default"} className="shrink-0">
                      {r.simulated ? "TEST" : "LIVE"}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`shrink-0 ${
                        r.action === "early_termination_flagged"
                          ? "border-amber-500/60 text-amber-600"
                          : r.action === "logged"
                            ? "border-emerald-500/40 text-emerald-600"
                            : ""
                      }`}
                    >
                      {r.action}
                    </Badge>
                    <span className="font-mono text-xs truncate">{r.event_type}</span>
                    <span className="ml-auto text-xs text-muted-foreground shrink-0">
                      {new Date(r.received_at).toLocaleString()}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="mt-2 space-y-2">
                      <div className="text-xs text-muted-foreground grid sm:grid-cols-2 gap-x-4 gap-y-1">
                        <div>
                          sub: <code>{r.subscription_id ?? "—"}</code>
                        </div>
                        <div>
                          event_id: <code>{r.event_id ?? "—"}</code>
                        </div>
                        <div>
                          cancel_at_period_end: <code>{String(r.cancel_at_period_end)}</code>
                        </div>
                        <div>
                          contract_ends_at:{" "}
                          <code>
                            {r.contract_ends_at
                              ? new Date(r.contract_ends_at).toLocaleString()
                              : "—"}
                          </code>
                        </div>
                      </div>
                      {r.note && (
                        <div className="text-xs bg-muted/30 rounded-md p-2 font-mono whitespace-pre-wrap">
                          {r.note}
                        </div>
                      )}
                      <pre className="text-xs bg-muted/30 rounded-md p-3 overflow-auto max-h-64 whitespace-pre-wrap">
                        {JSON.stringify(r.payload, null, 2)}
                      </pre>
                      {(r.simulated || !r.ok) && (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReprocess(r.id);
                            }}
                            disabled={reprocessingId === r.id}
                          >
                            {reprocessingId === r.id ? (
                              <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                            ) : (
                              <RefreshCw className="w-3.5 h-3.5 mr-2" />
                            )}
                            Reprocess event
                          </Button>
                          <span className="text-xs text-muted-foreground">
                            Re-runs the handler against the stored payload and updates this row.
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function WebhookSimulator({
  orgId,
  onCompleted,
}: {
  orgId: string;
  onCompleted: () => Promise<void>;
}) {
  const simulate = useServerFn(simulateSubscriptionEvent);
  const [running, setRunning] = useState(false);
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(true);
  const [contractEndsAt, setContractEndsAt] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    return d.toISOString().slice(0, 10);
  });
  const [lastResult, setLastResult] = useState<unknown>(null);

  async function fire() {
    setRunning(true);
    try {
      const res = await simulate({
        data: {
          organization_id: orgId,
          cancel_at_period_end: cancelAtPeriodEnd,
          contract_ends_at: contractEndsAt ? new Date(contractEndsAt).toISOString() : null,
        },
      });
      setLastResult(res);
      const r = res as { ok: boolean; action: string; note: string };
      if (r.ok) {
        toast.success(`Handler ran: ${r.action}`);
        await onCompleted();
      } else {
        toast.error(r.note);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Simulation failed");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="rounded-md border border-dashed border-border/60 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Beaker className="w-4 h-4 text-muted-foreground" />
        <div className="font-medium text-sm">
          Test mode — simulate customer.subscription.updated
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Runs a fake event through the real processor so the readiness row updates exactly as it will
        when Stripe is live. Result is tagged <code>[TEST]</code> in the notes.
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={cancelAtPeriodEnd}
            onCheckedChange={(v) => setCancelAtPeriodEnd(v === true)}
          />
          cancel_at_period_end = true
        </label>
        <div className="space-y-1">
          <Label className="text-xs">metadata.contract_ends_at</Label>
          <input
            type="date"
            value={contractEndsAt}
            onChange={(e) => setContractEndsAt(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
          />
        </div>
      </div>
      <Button onClick={fire} disabled={running} size="sm">
        {running ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Beaker className="w-4 h-4 mr-2" />
        )}
        Send simulated event
      </Button>
      {lastResult != null && (
        <pre className="text-xs bg-muted/30 rounded-md p-3 overflow-auto max-h-48 whitespace-pre-wrap">
          {JSON.stringify(lastResult, null, 2)}
        </pre>
      )}
    </div>
  );
}

function StatusCard({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  tone: "good" | "bad" | "neutral";
}) {
  const toneClasses =
    tone === "good"
      ? "text-emerald-500"
      : tone === "bad"
        ? "text-red-500"
        : "text-muted-foreground";
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
          <Icon className={`w-4 h-4 ${toneClasses}`} />
          {label}
        </div>
        <div className={`mt-2 font-display text-xl font-semibold ${toneClasses}`}>{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
      </CardContent>
    </Card>
  );
}
