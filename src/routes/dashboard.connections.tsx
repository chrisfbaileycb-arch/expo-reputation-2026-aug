import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  startGbpConnect,
  listGbpConnections,
  listGbpAvailableLocations,
  linkLocationToGbp,
  disconnectGbp,
} from "@/lib/gbp.functions";
import { Link2, RefreshCw, Trash2, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";

type SearchParams = { gbp?: "ok" | "error"; reason?: string; email?: string };

export const Route = createFileRoute("/dashboard/connections")({
  validateSearch: (s: Record<string, unknown>): SearchParams => ({
    gbp: s.gbp === "ok" || s.gbp === "error" ? s.gbp : undefined,
    reason: typeof s.reason === "string" ? s.reason : undefined,
    email: typeof s.email === "string" ? s.email : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Connections — Expo Proxy Reputation" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ConnectionsPage,
});

function ConnectionsPage() {
  const search = useSearch({ from: "/dashboard/connections" });
  const qc = useQueryClient();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [locations, setLocations] = useState<
    Array<{ id: string; name: string; gbp_location_id: string | null }>
  >([]);
  const [activeConnection, setActiveConnection] = useState<string | null>(null);

  const start = useServerFn(startGbpConnect);
  const list = useServerFn(listGbpConnections);
  const listAvail = useServerFn(listGbpAvailableLocations);
  const link = useServerFn(linkLocationToGbp);
  const disc = useServerFn(disconnectGbp);

  // Toast the OAuth result
  useEffect(() => {
    if (search.gbp === "ok") toast.success(`Connected ${search.email ?? "Google account"}`);
    if (search.gbp === "error") toast.error(`Connection failed: ${search.reason ?? "unknown"}`);
  }, [search.gbp, search.reason, search.email]);

  // Load org + locations
  useEffect(() => {
    (async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("organization_id, role")
        .in("role", ["owner", "manager"])
        .limit(1);
      const org = roles?.[0]?.organization_id ?? null;
      setOrgId(org);
      if (org) {
        const { data: locs } = await supabase
          .from("locations")
          .select("id, name, gbp_location_id")
          .eq("organization_id", org);
        setLocations(locs ?? []);
      }
    })();
  }, []);

  const connectionsQ = useQuery({
    queryKey: ["gbp-connections", orgId],
    queryFn: () => list({ data: { organization_id: orgId! } }),
    enabled: !!orgId,
  });

  const availableQ = useQuery({
    queryKey: ["gbp-available", activeConnection],
    queryFn: () => listAvail({ data: { connection_id: activeConnection! } }),
    enabled: !!activeConnection,
  });

  const flatGbpLocations = useMemo(() => {
    const out: Array<{ account_id: string; location_id: string; label: string }> = [];
    for (const acct of availableQ.data ?? []) {
      for (const loc of acct.locations) {
        out.push({
          account_id: acct.account_id,
          location_id: loc.id,
          label: `${loc.title}${loc.address ? ` — ${loc.address}` : ""}`,
        });
      }
    }
    return out;
  }, [availableQ.data]);

  const connectMut = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("No organization");
      const res = await start({
        data: { organization_id: orgId, origin: window.location.origin },
      });
      window.location.href = res.url;
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const linkMut = useMutation({
    mutationFn: (vars: {
      location_id: string;
      account_id: string;
      gbp_location_id: string;
      connection_id: string;
    }) =>
      link({
        data: {
          location_id: vars.location_id,
          connection_id: vars.connection_id,
          gbp_account_id: vars.account_id,
          gbp_location_id: vars.gbp_location_id,
        },
      }),
    onSuccess: async () => {
      toast.success("Location linked");
      if (orgId) {
        const { data: locs } = await supabase
          .from("locations")
          .select("id, name, gbp_location_id")
          .eq("organization_id", orgId);
        setLocations(locs ?? []);
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const disconnectMut = useMutation({
    mutationFn: (connection_id: string) => disc({ data: { connection_id } }),
    onSuccess: () => {
      toast.success("Disconnected");
      qc.invalidateQueries({ queryKey: ["gbp-connections"] });
      setActiveConnection(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <header className="space-y-1">
        <h1 className="font-display text-3xl">Connections</h1>
        <p className="text-muted-foreground">
          Link your Google Business Profile so we can post replies and pull new reviews
          automatically.
        </p>
      </header>

      <Card className="p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-medium flex items-center gap-2">
              <Link2 className="w-4 h-4 text-primary" /> Google Business Profile
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Sign in with the Google account that manages your business listings.
            </p>
          </div>
          <Button onClick={() => connectMut.mutate()} disabled={!orgId || connectMut.isPending}>
            {connectMut.isPending ? "Redirecting…" : "Connect Google"}
          </Button>
        </div>

        {connectionsQ.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (connectionsQ.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No Google accounts connected yet.</p>
        ) : (
          <div className="space-y-2">
            {(connectionsQ.data ?? []).map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between border border-border/60 rounded-md px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  {c.status === "active" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                  )}
                  <div>
                    <div className="text-sm font-medium">{c.google_email}</div>
                    <div className="text-xs text-muted-foreground">
                      <Badge variant="outline" className="mr-2">
                        {c.status}
                      </Badge>
                      {c.last_error ? `Error: ${c.last_error}` : `Connected`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveConnection(c.id)}
                    disabled={c.status !== "active"}
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                    Manage locations
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => disconnectMut.mutate(c.id)}
                    disabled={disconnectMut.isPending}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {activeConnection && (
        <Card className="p-6 space-y-4">
          <div>
            <h2 className="font-medium">Link your locations</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Pick which Google location matches each of your tracked locations.
            </p>
          </div>

          {availableQ.isLoading ? (
            <p className="text-sm text-muted-foreground">Fetching Google locations…</p>
          ) : availableQ.error ? (
            <p className="text-sm text-destructive">{(availableQ.error as Error).message}</p>
          ) : locations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No locations in your org yet. Add one before linking.
            </p>
          ) : (
            <div className="space-y-3">
              {locations.map((loc) => {
                const linked = flatGbpLocations.find((g) => g.location_id === loc.gbp_location_id);
                return (
                  <div key={loc.id} className="grid grid-cols-[1fr,auto,2fr] gap-3 items-center">
                    <div>
                      <div className="text-sm font-medium">{loc.name}</div>
                      {linked && (
                        <div className="text-xs text-muted-foreground">Linked: {linked.label}</div>
                      )}
                    </div>
                    <span className="text-muted-foreground text-sm">→</span>
                    <Select
                      value={loc.gbp_location_id ?? ""}
                      onValueChange={(val) => {
                        const found = flatGbpLocations.find((g) => g.location_id === val);
                        if (!found) return;
                        linkMut.mutate({
                          location_id: loc.id,
                          account_id: found.account_id,
                          gbp_location_id: found.location_id,
                          connection_id: activeConnection,
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pick a Google location…" />
                      </SelectTrigger>
                      <SelectContent>
                        {flatGbpLocations.map((g) => (
                          <SelectItem key={g.location_id} value={g.location_id}>
                            {g.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      <Card className="p-6 bg-muted/30">
        <h3 className="font-medium text-sm mb-2 flex items-center gap-2">
          <ExternalLink className="w-3.5 h-3.5" /> Setup checklist
        </h3>
        <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
          <li>
            Google Cloud → enable <strong>My Business Account Management API</strong> +{" "}
            <strong>Business Information API</strong>.
          </li>
          <li>
            OAuth consent screen → external → scope <code className="text-xs">business.manage</code>
            .
          </li>
          <li>
            Authorized redirect URI:{" "}
            <code className="text-xs break-all">
              {typeof window !== "undefined"
                ? `${window.location.origin}/api/public/gbp/callback`
                : ""}
            </code>
          </li>
          <li>
            Save <code>GBP_CLIENT_ID</code> and <code>GBP_CLIENT_SECRET</code> in project secrets.
          </li>
        </ol>
      </Card>
    </div>
  );
}
