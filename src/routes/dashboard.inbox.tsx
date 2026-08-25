import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { ingestReviews } from "@/lib/reviews.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, ShieldAlert, Star, Inbox } from "lucide-react";

export const Route = createFileRoute("/dashboard/inbox")({
  head: () => ({
    meta: [
      { title: "Review Inbox — Expo Proxy Reputation" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InboxPage,
});

type Location = { id: string; name: string; organization_id: string };
type ReviewRow = {
  id: string;
  author_name: string | null;
  rating: number | null;
  body: string | null;
  platform: string;
  posted_at: string | null;
  violations: { severity: string; policy_title: string }[];
};

type Platform = "google" | "yelp" | "facebook" | "manual" | "other";

function InboxPage() {
  const ingest = useServerFn(ingestReviews);
  const [locations, setLocations] = useState<Location[]>([]);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string>("");
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Single form
  const [author, setAuthor] = useState("");
  const [rating, setRating] = useState<string>("5");
  const [platform, setPlatform] = useState<Platform>("google");
  const [body, setBody] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");

  // Bulk
  const [bulkJson, setBulkJson] = useState("");

  // Quick org/location create
  const [newOrgName, setNewOrgName] = useState("");
  const [newLocName, setNewLocName] = useState("");

  const loadAll = async () => {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("organization_id, role")
      .limit(1);
    const oid = roles?.[0]?.organization_id ?? null;
    setOrgId(oid);
    if (oid) {
      const { data: locs } = await supabase
        .from("locations")
        .select("id, name, organization_id")
        .eq("organization_id", oid)
        .order("created_at");
      setLocations(locs ?? []);
      if (locs && locs.length && !locationId) setLocationId(locs[0].id);
      await loadReviews(oid);
    }
    setLoading(false);
  };

  const loadReviews = async (oid: string) => {
    const { data } = await supabase
      .from("reviews")
      .select(
        "id, author_name, rating, body, platform, posted_at, policy_violations(severity, policy_title)",
      )
      .eq("organization_id", oid)
      .order("posted_at", { ascending: false })
      .limit(50);
    setReviews(
      (data ?? []).map((r: any) => ({
        ...r,
        violations: r.policy_violations ?? [],
      })),
    );
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createOrgAndLocation = async () => {
    if (!newOrgName.trim() || !newLocName.trim()) {
      toast.error("Enter both organization and location name");
      return;
    }
    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes.user?.id;
    if (!uid) return;
    const { data: org, error: orgErr } = await supabase
      .from("organizations")
      .insert({ name: newOrgName.trim(), created_by: uid })
      .select("id")
      .single();
    if (orgErr || !org) {
      toast.error(orgErr?.message ?? "Failed to create organization");
      return;
    }
    const { error: roleErr } = await supabase
      .from("user_roles")
      .insert({ user_id: uid, organization_id: org.id, role: "owner" });
    if (roleErr) {
      toast.error(roleErr.message);
      return;
    }
    const { data: loc, error: locErr } = await supabase
      .from("locations")
      .insert({ organization_id: org.id, name: newLocName.trim() })
      .select("id, name, organization_id")
      .single();
    if (locErr || !loc) {
      toast.error(locErr?.message ?? "Failed to create location");
      return;
    }
    toast.success("Organization and location created");
    setNewOrgName("");
    setNewLocName("");
    await loadAll();
  };

  const submitSingle = async () => {
    if (!locationId) return toast.error("Select a location");
    if (!body.trim()) return toast.error("Review text is required");
    setSubmitting(true);
    try {
      const result = await ingest({
        data: {
          location_id: locationId,
          reviews: [
            {
              author_name: author.trim() || null,
              rating: rating ? Number(rating) : null,
              body: body.trim(),
              platform,
              source_url: sourceUrl.trim() || null,
              posted_at: new Date().toISOString(),
            },
          ],
        },
      });
      toast.success(
        `Imported ${result.inserted} review · ${result.flagged} policy flag${result.flagged === 1 ? "" : "s"}`,
      );
      setAuthor("");
      setBody("");
      setSourceUrl("");
      if (orgId) await loadReviews(orgId);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const submitBulk = async () => {
    if (!locationId) return toast.error("Select a location");
    let parsed: unknown;
    try {
      parsed = JSON.parse(bulkJson);
    } catch {
      return toast.error("Bulk input must be valid JSON array");
    }
    if (!Array.isArray(parsed) || !parsed.length)
      return toast.error("Provide a non-empty JSON array");
    setSubmitting(true);
    try {
      const result = await ingest({
        data: { location_id: locationId, reviews: parsed as any },
      });
      toast.success(
        `Imported ${result.inserted} · flagged ${result.flagged}${result.errors.length ? ` · ${result.errors.length} errors` : ""}`,
      );
      if (result.errors.length) console.warn("ingest errors", result.errors);
      setBulkJson("");
      if (orgId) await loadReviews(orgId);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-muted-foreground flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading…
      </div>
    );
  }

  if (!orgId) {
    return (
      <div className="p-8 max-w-xl">
        <h1 className="font-display text-2xl font-semibold mb-2">Get started</h1>
        <p className="text-muted-foreground mb-6 text-sm">
          Create your organization and first location to start ingesting reviews.
        </p>
        <Card className="p-5 space-y-4">
          <div>
            <Label>Organization name</Label>
            <Input
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
              placeholder="Rosewood Salon LLC"
            />
          </div>
          <div>
            <Label>First location name</Label>
            <Input
              value={newLocName}
              onChange={(e) => setNewLocName(e.target.value)}
              placeholder="Rosewood Salon — Downtown"
            />
          </div>
          <Button onClick={createOrgAndLocation}>Create</Button>
        </Card>
      </div>
    );
  }

  if (!locations.length) {
    return (
      <div className="p-8 max-w-xl">
        <h1 className="font-display text-2xl font-semibold mb-2">Add a location</h1>
        <Card className="p-5 space-y-4">
          <div>
            <Label>Location name</Label>
            <Input value={newLocName} onChange={(e) => setNewLocName(e.target.value)} />
          </div>
          <Button
            onClick={async () => {
              const { data: loc, error } = await supabase
                .from("locations")
                .insert({ organization_id: orgId, name: newLocName.trim() })
                .select("id, name, organization_id")
                .single();
              if (error || !loc) return toast.error(error?.message ?? "Failed");
              setNewLocName("");
              setLocations([loc]);
              setLocationId(loc.id);
            }}
          >
            Add location
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold">Review Inbox</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Paste or upload reviews. The AI policy scanner flags anything that violates Google, Yelp,
          or Facebook review policies.
        </p>
      </div>

      <Card className="p-5 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Label className="text-sm">Location</Label>
          <Select value={locationId} onValueChange={setLocationId}>
            <SelectTrigger className="w-72">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {locations.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="single">
          <TabsList>
            <TabsTrigger value="single">Single review</TabsTrigger>
            <TabsTrigger value="bulk">Bulk (JSON)</TabsTrigger>
          </TabsList>

          <TabsContent value="single" className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label>Author</Label>
                <Input value={author} onChange={(e) => setAuthor(e.target.value)} />
              </div>
              <div>
                <Label>Rating</Label>
                <Select value={rating} onValueChange={setRating}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n} star{n === 1 ? "" : "s"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Platform</Label>
                <Select value={platform} onValueChange={(v) => setPlatform(v as Platform)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="google">Google</SelectItem>
                    <SelectItem value="yelp">Yelp</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Review text</Label>
              <Textarea
                rows={5}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Paste the review content here…"
              />
            </div>
            <div>
              <Label>Source URL (optional)</Label>
              <Input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} />
            </div>
            <Button onClick={submitSingle} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Import & scan
            </Button>
          </TabsContent>

          <TabsContent value="bulk" className="space-y-3 pt-4">
            <p className="text-xs text-muted-foreground">
              Paste a JSON array. Each item supports: <code>author_name</code>, <code>rating</code>{" "}
              (1-5), <code>body</code> (required), <code>platform</code>{" "}
              (google/yelp/facebook/manual/other), <code>posted_at</code>, <code>source_url</code>.
              Max 50 per batch.
            </p>
            <Textarea
              rows={10}
              value={bulkJson}
              onChange={(e) => setBulkJson(e.target.value)}
              placeholder={`[\n  { "author_name": "Jane D.", "rating": 1, "body": "Worst experience ever, the owner is a crook!", "platform": "google" }\n]`}
              className="font-mono text-xs"
            />
            <Button onClick={submitBulk} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Import batch
            </Button>
          </TabsContent>
        </Tabs>
      </Card>

      <div className="mb-3 flex items-center gap-2">
        <Inbox className="w-4 h-4 text-primary" />
        <h2 className="font-display text-lg font-semibold">Recent reviews</h2>
        <Badge variant="secondary">{reviews.length}</Badge>
      </div>

      <div className="space-y-3">
        {reviews.length === 0 && (
          <Card className="p-8 text-center text-sm text-muted-foreground border-dashed">
            No reviews yet. Import one above to see the policy scanner in action.
          </Card>
        )}
        {reviews.map((r) => (
          <Card key={r.id} className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{r.author_name ?? "Anonymous"}</span>
                  <Badge variant="outline" className="text-xs capitalize">
                    {r.platform}
                  </Badge>
                  {r.rating != null && (
                    <span className="flex items-center text-xs text-muted-foreground">
                      <Star className="w-3 h-3 mr-0.5 fill-current" />
                      {r.rating}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {r.posted_at ? new Date(r.posted_at).toLocaleDateString() : ""}
                  </span>
                </div>
                <p className="text-sm text-foreground/90 line-clamp-3">{r.body}</p>
              </div>
              {r.violations.length > 0 && (
                <div className="shrink-0 flex flex-col items-end gap-1">
                  <Badge variant="destructive" className="gap-1">
                    <ShieldAlert className="w-3 h-3" />
                    {r.violations.length} flag{r.violations.length === 1 ? "" : "s"}
                  </Badge>
                  {r.violations.slice(0, 2).map((v, i) => (
                    <span key={i} className="text-xs text-muted-foreground">
                      {v.severity} · {v.policy_title}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
