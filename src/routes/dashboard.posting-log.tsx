import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { listPostingAttempts } from "@/lib/postingAttempts.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, RefreshCw, CheckCircle2, XCircle } from "lucide-react";

export const Route = createFileRoute("/dashboard/posting-log")({
  head: () => ({
    meta: [
      { title: "Posting Log — Expo Proxy Reputation" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PostingLogPage,
});

type Attempt = Awaited<ReturnType<typeof listPostingAttempts>>[number];

function PostingLogPage() {
  const fetchAttempts = useServerFn(listPostingAttempts);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgs, setOrgs] = useState<{ id: string; name: string }[]>([]);
  const [filter, setFilter] = useState<"all" | "success" | "fail">("all");
  const [rows, setRows] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("organizations")
      .select("id, name")
      .order("name")
      .then(({ data }) => {
        const list = data ?? [];
        setOrgs(list);
        if (list[0]) setOrgId(list[0].id);
      });
  }, []);

  const load = useMemo(
    () => async () => {
      if (!orgId) return;
      setLoading(true);
      try {
        const data = await fetchAttempts({
          data: {
            organization_id: orgId,
            limit: 200,
            success: filter === "all" ? undefined : filter === "success",
          },
        });
        setRows(data);
      } finally {
        setLoading(false);
      }
    },
    [orgId, filter, fetchAttempts],
  );

  useEffect(() => {
    load();
  }, [load]);

  const downloadCsv = async () => {
    if (!orgId) return;
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    const url = `/api/posting-attempts.csv?organization_id=${encodeURIComponent(orgId)}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `posting-attempts-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-semibold">Posting Log</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Every auto-poster attempt — request, status, timing, and the redacted response.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={downloadCsv} disabled={!orgId}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {orgs.length > 1 && (
          <select
            className="bg-background border border-border rounded-md px-3 py-1.5 text-sm"
            value={orgId ?? ""}
            onChange={(e) => setOrgId(e.target.value)}
          >
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        )}
        <div className="flex gap-1 rounded-md border border-border p-1">
          {(["all", "success", "fail"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-xs rounded ${
                filter === f ? "bg-accent text-foreground" : "text-muted-foreground"
              }`}
            >
              {f === "all" ? "All" : f === "success" ? "Successful" : "Failed"}
            </button>
          ))}
        </div>
        <div className="text-xs text-muted-foreground ml-auto">{rows.length} entries</div>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left px-3 py-2">When</th>
              <th className="text-left px-3 py-2">Platform</th>
              <th className="text-left px-3 py-2">Status</th>
              <th className="text-left px-3 py-2">HTTP</th>
              <th className="text-left px-3 py-2">Attempt</th>
              <th className="text-left px-3 py-2">Latency</th>
              <th className="text-left px-3 py-2">Detail</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                  No posting attempts yet.
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const isOpen = expanded === r.id;
              return (
                <>
                  <tr
                    key={r.id}
                    className="border-t border-border/60 hover:bg-accent/20 cursor-pointer"
                    onClick={() => setExpanded(isOpen ? null : r.id)}
                  >
                    <td className="px-3 py-2 text-xs whitespace-nowrap">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 capitalize">{r.platform}</td>
                    <td className="px-3 py-2">
                      {r.success ? (
                        <Badge variant="outline" className="text-emerald-600 border-emerald-600/40">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> posted
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-red-600 border-red-600/40">
                          <XCircle className="w-3 h-3 mr-1" /> failed
                        </Badge>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{r.http_status ?? "—"}</td>
                    <td className="px-3 py-2 font-mono text-xs">#{r.attempt_number}</td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {r.duration_ms != null ? `${r.duration_ms}ms` : "—"}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground truncate max-w-[280px]">
                      {r.error_message ?? r.platform_response_id ?? "—"}
                    </td>
                  </tr>
                  {isOpen && (
                    <tr key={`${r.id}-detail`} className="bg-muted/20">
                      <td colSpan={7} className="px-3 py-3 text-xs">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <Field label="Endpoint" value={r.endpoint} mono />
                          <Field label="Platform response ID" value={r.platform_response_id} mono />
                          <Field label="Draft ID" value={r.draft_id} mono />
                          <Field label="Review ID" value={r.review_id} mono />
                          <Field label="Location ID" value={r.location_id} mono />
                          <Field label="Error" value={r.error_message} />
                        </div>
                        {r.response_snippet && (
                          <div className="mt-3">
                            <div className="text-muted-foreground mb-1">Response (redacted)</div>
                            <pre className="bg-background border border-border rounded p-2 overflow-x-auto whitespace-pre-wrap">
                              {r.response_snippet}
                            </pre>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string | null; mono?: boolean }) {
  return (
    <div>
      <div className="text-muted-foreground">{label}</div>
      <div className={mono ? "font-mono break-all" : "break-words"}>{value ?? "—"}</div>
    </div>
  );
}
