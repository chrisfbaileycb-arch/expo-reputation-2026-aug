import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Plus, Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/settings")({
  head: () => ({
    meta: [{ title: "Settings — Expo Proxy Reputation" }, { name: "robots", content: "noindex" }],
  }),
  component: SettingsPage,
});

type Policy = {
  id?: string;
  organization_id: string;
  brand_voice: string;
  signature: string | null;
  auto_post_min_rating: number;
  auto_post_delay_minutes: number;
  require_approval_max_rating: number;
  enabled: boolean;
};

type Rule = {
  id: string;
  organization_id: string;
  channel: string;
  recipient: string;
  event_type: string;
  min_rating: number | null;
  max_rating: number | null;
  enabled: boolean;
};

const EVENT_TYPES: Array<{ value: string; label: string; defaults: Partial<Rule> }> = [
  {
    value: "negative_review",
    label: "Negative review (1–3★)",
    defaults: { min_rating: 1, max_rating: 3 },
  },
  {
    value: "policy_violation",
    label: "Policy violation flagged",
    defaults: { min_rating: null, max_rating: null },
  },
  { value: "any_review", label: "Any new review", defaults: { min_rating: 1, max_rating: 5 } },
  {
    value: "draft_pending",
    label: "Draft needs approval",
    defaults: { min_rating: null, max_rating: null },
  },
];

function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);

  // new rule draft
  const [newRecipient, setNewRecipient] = useState("");
  const [newEvent, setNewEvent] = useState("negative_review");

  useEffect(() => {
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      const uid = session.session?.user.id;
      if (!uid) return;
      const { data: role } = await supabase
        .from("user_roles")
        .select("organization_id")
        .eq("user_id", uid)
        .limit(1)
        .maybeSingle();
      const oid = role?.organization_id ?? null;
      setOrgId(oid);
      if (!oid) {
        setLoading(false);
        return;
      }
      const [{ data: pol }, { data: rs }] = await Promise.all([
        supabase.from("response_policies").select("*").eq("organization_id", oid).maybeSingle(),
        supabase
          .from("notification_rules")
          .select("*")
          .eq("organization_id", oid)
          .order("created_at", { ascending: true }),
      ]);
      setPolicy(
        pol ?? {
          organization_id: oid,
          brand_voice:
            "Warm, professional, concise. Thank the reviewer by first name when given. Never argue.",
          signature: null,
          auto_post_min_rating: 4,
          auto_post_delay_minutes: 15,
          require_approval_max_rating: 3,
          enabled: true,
        },
      );
      setRules((rs ?? []) as Rule[]);
      setLoading(false);
    })();
  }, []);

  const negativeRules = useMemo(
    () => rules.filter((r) => r.event_type === "negative_review"),
    [rules],
  );
  const violationRules = useMemo(
    () => rules.filter((r) => r.event_type === "policy_violation"),
    [rules],
  );
  const otherRules = useMemo(
    () =>
      rules.filter(
        (r) => r.event_type !== "negative_review" && r.event_type !== "policy_violation",
      ),
    [rules],
  );

  async function savePolicy() {
    if (!policy || !orgId) return;
    setSaving(true);
    const payload = { ...policy, organization_id: orgId };
    const { error } = await supabase
      .from("response_policies")
      .upsert(payload, { onConflict: "organization_id" })
      .select("id")
      .maybeSingle();
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Response policy saved");
  }

  async function addRule() {
    if (!orgId) return;
    const email = newRecipient.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Enter a valid email address");
      return;
    }
    const defaults = EVENT_TYPES.find((e) => e.value === newEvent)?.defaults ?? {};
    const { data, error } = await supabase
      .from("notification_rules")
      .insert({
        organization_id: orgId,
        channel: "email",
        recipient: email,
        event_type: newEvent,
        enabled: true,
        min_rating: defaults.min_rating ?? null,
        max_rating: defaults.max_rating ?? null,
      })
      .select("*")
      .single();
    if (error || !data) {
      toast.error(error?.message ?? "Could not add rule");
      return;
    }
    setRules((prev) => [...prev, data as Rule]);
    setNewRecipient("");
    toast.success("Alert rule added");
  }

  async function toggleRule(id: string, enabled: boolean) {
    const prev = rules;
    setRules((r) => r.map((x) => (x.id === id ? { ...x, enabled } : x)));
    const { error } = await supabase.from("notification_rules").update({ enabled }).eq("id", id);
    if (error) {
      setRules(prev);
      toast.error(error.message);
    }
  }

  async function deleteRule(id: string) {
    const prev = rules;
    setRules((r) => r.filter((x) => x.id !== id));
    const { error } = await supabase.from("notification_rules").delete().eq("id", id);
    if (error) {
      setRules(prev);
      toast.error(error.message);
    }
  }

  if (loading) {
    return (
      <div className="p-10 text-muted-foreground flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading settings…
      </div>
    );
  }

  if (!orgId) {
    return (
      <div className="p-10 max-w-2xl">
        <h1 className="font-display text-2xl mb-2">No organization found</h1>
        <p className="text-muted-foreground">
          You're not a member of any organization yet. Create one from the overview to manage
          settings.
        </p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl space-y-8">
      <div>
        <h1 className="font-display text-3xl">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure how drafts are written, which reviews auto-post, and who gets alerted.
        </p>
      </div>

      {/* Notification rules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" /> Alert recipients
          </CardTitle>
          <CardDescription>
            Choose which email addresses get alerted when a low-star review comes in or a policy
            violation is flagged. Alerts send through your verified sender domain.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid sm:grid-cols-[1fr_220px_auto] gap-2">
            <div>
              <Label htmlFor="recip" className="text-xs">
                Email address
              </Label>
              <Input
                id="recip"
                type="email"
                placeholder="owner@yourbusiness.com"
                value={newRecipient}
                onChange={(e) => setNewRecipient(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Alert on</Label>
              <Select value={newEvent} onValueChange={setNewEvent}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((e) => (
                    <SelectItem key={e.value} value={e.value}>
                      {e.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={addRule} className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
          </div>

          <RuleSection
            title="Negative reviews (1–3★)"
            empty="No one will be alerted to negative reviews. Add at least one recipient so 1–3★ reviews don't slip past you."
            rules={negativeRules}
            onToggle={toggleRule}
            onDelete={deleteRule}
          />
          <RuleSection
            title="Policy violations"
            empty="No one will be alerted when the scanner flags a review for removal. Add a recipient to act on these fast."
            rules={violationRules}
            onToggle={toggleRule}
            onDelete={deleteRule}
          />
          {otherRules.length > 0 && (
            <RuleSection
              title="Other alerts"
              empty=""
              rules={otherRules}
              onToggle={toggleRule}
              onDelete={deleteRule}
            />
          )}
        </CardContent>
      </Card>

      {/* Response policy */}
      {policy && (
        <Card>
          <CardHeader>
            <CardTitle>Reply policy & brand voice</CardTitle>
            <CardDescription>
              Controls how AI drafts replies and when they auto-post. 3★ and below always require
              your approval.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
              <div>
                <div className="font-medium">Auto-drafting enabled</div>
                <div className="text-sm text-muted-foreground">
                  When off, no drafts are generated for incoming reviews.
                </div>
              </div>
              <Switch
                checked={policy.enabled}
                onCheckedChange={(v) => setPolicy({ ...policy, enabled: v })}
              />
            </div>

            <div>
              <Label htmlFor="bv">Brand voice</Label>
              <Textarea
                id="bv"
                rows={4}
                value={policy.brand_voice}
                onChange={(e) => setPolicy({ ...policy, brand_voice: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="sig">Signature (optional)</Label>
              <Input
                id="sig"
                placeholder="— The Smith Family, Owners"
                value={policy.signature ?? ""}
                onChange={(e) => setPolicy({ ...policy, signature: e.target.value || null })}
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Auto-post star threshold</Label>
                <Select
                  value={String(policy.auto_post_min_rating)}
                  onValueChange={(v) => setPolicy({ ...policy, auto_post_min_rating: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4">4★ and above</SelectItem>
                    <SelectItem value="5">5★ only</SelectItem>
                    <SelectItem value="6">Never auto-post</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Yelp is always manual (Yelp's terms prohibit API auto-posting).
                </p>
              </div>
              <div>
                <Label htmlFor="delay">Auto-post delay (minutes)</Label>
                <Input
                  id="delay"
                  type="number"
                  min={0}
                  max={1440}
                  value={policy.auto_post_delay_minutes}
                  onChange={(e) =>
                    setPolicy({
                      ...policy,
                      auto_post_delay_minutes: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Gives you a window to cancel a scheduled reply before it posts.
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={savePolicy} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save policy
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function RuleSection({
  title,
  empty,
  rules,
  onToggle,
  onDelete,
}: {
  title: string;
  empty: string;
  rules: Rule[];
  onToggle: (id: string, enabled: boolean) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div>
      <div className="text-sm font-medium mb-2">{title}</div>
      {rules.length === 0 ? (
        empty ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : null
      ) : (
        <ul className="divide-y divide-border/60 rounded-lg border border-border/60">
          {rules.map((r) => (
            <li key={r.id} className="flex items-center gap-3 px-3 py-2">
              <div className="flex-1">
                <div className="text-sm font-medium">{r.recipient}</div>
                <div className="text-xs text-muted-foreground flex gap-2 mt-0.5">
                  <Badge variant="secondary" className="text-[10px]">
                    email
                  </Badge>
                  {r.min_rating != null && r.max_rating != null && (
                    <span>
                      {r.min_rating}–{r.max_rating}★
                    </span>
                  )}
                </div>
              </div>
              <Switch checked={r.enabled} onCheckedChange={(v) => onToggle(r.id, v)} />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(r.id)}
                aria-label="Delete rule"
              >
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
