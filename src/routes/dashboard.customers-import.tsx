import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { previewCustomerImport, importCustomers } from "@/lib/customers.functions";
import { enqueueInvites } from "@/lib/outreach.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Loader2,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Copy,
  FileText,
  Utensils,
  CalendarDays,
  Gift,
  Clock,
  Send,
  UserCheck,
  XCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ShieldAlert,
  Star,
  Mail,
} from "lucide-react";

export const Route = createFileRoute("/dashboard/customers-import")({
  head: () => ({
    meta: [
      { title: "Import Customers — Expo Proxy Reputation" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CustomersImportPage,
});

type Location = { id: string; name: string };
type Field = "full_name" | "email" | "phone" | "transaction_at" | "service_type" | "";

const FIELD_LABELS: Record<Exclude<Field, "">, string> = {
  full_name: "Full name",
  email: "Email",
  phone: "Phone",
  transaction_at: "Transaction / Appointment timestamp",
  service_type: "Service / Dining Notes",
};

const RESTAURANT_DISCOUNTS = [
  "10% Off Next Meal",
  "Free Appetizer with Entree",
  "Free Dessert",
  "Free Beverage",
  "$10 Off Orders of $30+",
  "15% Off Next Takeout Order",
  "Custom Discount Reward",
];

const APPOINTMENT_DISCOUNTS = [
  "10% Off Next Appointment",
  "$15 Off Next Service",
  "Free Service Add-On / Upgrade",
  "Complimentary Treatment",
  "$10 Gift Voucher",
  "Custom Discount Reward",
];

function autoDetect(header: string): Field {
  const h = header.toLowerCase().trim();
  if (/name/.test(h)) return "full_name";
  if (/email|e-?mail/.test(h)) return "email";
  if (/phone|mobile|cell/.test(h)) return "phone";
  if (/date|time|order|txn|transaction|visit|completed|appt|appointment/.test(h))
    return "transaction_at";
  if (/service|item|notes|provider|stylist|type/.test(h)) return "service_type";
  return "";
}

/** CSV parser: handles quoted fields with embedded commas & escaped quotes. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQuotes = false;
      } else cur += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") {
        row.push(cur);
        cur = "";
      } else if (c === "\n" || c === "\r") {
        if (cur.length || row.length) {
          row.push(cur);
          rows.push(row);
          row = [];
          cur = "";
        }
        if (c === "\r" && text[i + 1] === "\n") i++;
      } else cur += c;
    }
  }
  if (cur.length || row.length) {
    row.push(cur);
    rows.push(row);
  }
  return rows;
}

type PreviewResult = Awaited<ReturnType<typeof previewCustomerImport>>;

function CustomersImportPage() {
  const preview = useServerFn(previewCustomerImport);
  const doImport = useServerFn(importCustomers);
  const invite = useServerFn(enqueueInvites);

  const [locations, setLocations] = useState<Location[]>([]);
  const [locationId, setLocationId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Business Model & Discount Token Config
  const [businessModel, setBusinessModel] = useState<"restaurant" | "appointment">("restaurant");
  const [discountToken, setDiscountToken] = useState<string>("10% Off Next Meal");
  const [customDiscountText, setCustomDiscountText] = useState("");

  const activeDiscountValue =
    discountToken === "Custom Discount Reward"
      ? customDiscountText || "Special Discount Token"
      : discountToken;

  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<number, Field>>({});
  const [rawText, setRawText] = useState("");

  const [previewData, setPreviewData] = useState<PreviewResult | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [importing, setImporting] = useState(false);

  const [lastImport, setLastImport] = useState<{
    inserted: number;
    skipped: number;
    invalid: number;
    inserted_ids: string[];
    organization_id: string;
    business_model: "restaurant" | "appointment";
    discount_token: string;
  } | null>(null);

  const [showWorkflowGuide, setShowWorkflowGuide] = useState(false);
  const [sending, setSending] = useState(false);
  const [lastSend, setLastSend] = useState<{ queued: number; skipped: number } | null>(null);

  useEffect(() => {
    (async () => {
      const { data: roles } = await supabase.from("user_roles").select("organization_id").limit(1);
      const oid = roles?.[0]?.organization_id;
      if (oid) {
        const { data: locs } = await supabase
          .from("locations")
          .select("id, name")
          .eq("organization_id", oid)
          .order("created_at");
        setLocations(locs ?? []);
        if (locs?.[0]) setLocationId(locs[0].id);
      }
      setLoading(false);
    })();
  }, []);

  // Update default discount token when business model changes
  const handleModelChange = (model: "restaurant" | "appointment") => {
    setBusinessModel(model);
    if (model === "restaurant") {
      setDiscountToken(RESTAURANT_DISCOUNTS[0]);
    } else {
      setDiscountToken(APPOINTMENT_DISCOUNTS[0]);
    }
  };

  const parseInput = (text: string) => {
    setRawText(text);
    setPreviewData(null);
    const parsed = parseCsv(text.trim());
    if (!parsed.length) {
      setHeaders([]);
      setRows([]);
      return;
    }
    const [hdr, ...rest] = parsed;
    setHeaders(hdr);
    setRows(rest.filter((r) => r.some((c) => c.trim())));
    const map: Record<number, Field> = {};
    hdr.forEach((h, i) => (map[i] = autoDetect(h)));
    setMapping(map);
  };

  const onFile = async (f: File) => {
    const text = await f.text();
    parseInput(text);
    toast.success(`Loaded ${f.name}`);
  };

  const mappedRows = useMemo(() => {
    return rows.map((r) => {
      const out: Record<Exclude<Field, "">, string | null> = {
        full_name: null,
        email: null,
        phone: null,
        transaction_at: null,
        service_type: null,
      };
      for (const [idxStr, field] of Object.entries(mapping)) {
        if (!field) continue;
        const idx = Number(idxStr);
        const v = (r[idx] ?? "").trim();
        if (v) out[field] = v;
      }
      return out;
    });
  }, [rows, mapping]);

  const canPreview =
    !!locationId &&
    mappedRows.length > 0 &&
    (Object.values(mapping).includes("email") || Object.values(mapping).includes("phone"));

  const runPreview = async () => {
    if (!canPreview) return;
    setPreviewing(true);
    try {
      const res = await preview({
        data: {
          location_id: locationId,
          business_model: businessModel,
          discount_token: activeDiscountValue,
          rows: mappedRows,
        },
      });
      setPreviewData(res);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPreviewing(false);
    }
  };

  const runImport = async () => {
    if (!previewData) return;
    setImporting(true);
    try {
      const res = await doImport({
        data: {
          location_id: locationId,
          business_model: businessModel,
          discount_token: activeDiscountValue,
          rows: mappedRows,
          skip_duplicates: true,
        },
      });
      toast.success(
        `Imported ${res.inserted} new contacts for 2-stage outreach. ${res.skipped} skipped/crossed off.`,
      );
      setLastImport(res);
      setLastSend(null);
      setRawText("");
      setHeaders([]);
      setRows([]);
      setMapping({});
      setPreviewData(null);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setImporting(false);
    }
  };

  const sendInvites = async () => {
    if (!lastImport || lastImport.inserted_ids.length === 0) return;
    setSending(true);
    try {
      const res = await invite({
        data: {
          organization_id: lastImport.organization_id,
          location_id: locationId || null,
          contact_ids: lastImport.inserted_ids,
          discount_token: lastImport.discount_token,
          business_model: lastImport.business_model,
        },
      });
      setLastSend(res);
      toast.success(
        `Queued ${res.queued} initial pulse invite${res.queued === 1 ? "" : "s"}! Stage 2 (Google Review + ${lastImport.discount_token}) will auto-follow after response.`,
      );
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-muted-foreground flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading setup…
      </div>
    );
  }

  if (!locations.length) {
    return (
      <div className="p-8 max-w-xl">
        <h1 className="font-display text-2xl font-semibold mb-2">Add a location first</h1>
        <p className="text-sm text-muted-foreground">
          Head to Review Inbox to create your organization and first location, then come back here
          to import customer lists.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Customer List Ingestion &amp; Review Outreach
          </h1>
          <p className="text-muted-foreground mt-1 text-sm max-w-3xl">
            Upload recent customer files from POS downloads or calendar exports. We interpret
            whether each customer has already left a review (crossing them off automatically) and
            queue non-reviewed customers for our high-converting 2-stage outreach sequence.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowWorkflowGuide(!showWorkflowGuide)}
          className="shrink-0 gap-2 self-start md:self-auto"
        >
          <Sparkles className="w-4 h-4 text-primary" />
          {showWorkflowGuide ? "Hide Funnel Workflow" : "View Funnel Workflow"}
          {showWorkflowGuide ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Visual Funnel Lifecycle Guide Banner */}
      {showWorkflowGuide && (
        <Card className="p-5 border-primary/30 bg-primary/5 space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center justify-between border-b border-primary/10 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm">
                Automated Customer Lifecycle:{" "}
                {businessModel === "restaurant"
                  ? "Restaurant / Walk-In Funnel"
                  : "Appointment & Service Funnel"}
              </span>
            </div>
            <Badge variant="secondary" className="text-[11px]">
              Active Token: {activeDiscountValue}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            {/* Step 1 */}
            <div className="rounded-xl border border-border bg-card p-3 space-y-1.5 shadow-xs">
              <div className="flex items-center gap-1.5 font-bold text-foreground">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px]">
                  1
                </span>
                <span>Ingest &amp; Normalize</span>
              </div>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                {businessModel === "restaurant"
                  ? "Upload weekly POS sales list (Toast, Square, Clover). Extracts name, phone/email, and visit date."
                  : "Upload daily appointment export (Mindbody, Boulevard, Acuity). Extracts client, service type, and timestamp."}
              </p>
            </div>

            {/* Step 2 */}
            <div className="rounded-xl border border-border bg-card p-3 space-y-1.5 shadow-xs">
              <div className="flex items-center gap-1.5 font-bold text-foreground">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px]">
                  2
                </span>
                <span>Review Cross-Check</span>
              </div>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Matches past reviewers. <strong>4-5★ reviewers are crossed off</strong>{" "}
                (auto-thanked). <strong>1-3★ reviewers</strong> route to Make-It-Right queue.
              </p>
            </div>

            {/* Step 3 */}
            <div className="rounded-xl border border-border bg-card p-3 space-y-1.5 shadow-xs">
              <div className="flex items-center gap-1.5 font-bold text-foreground">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px]">
                  3
                </span>
                <span>Stage 1: Pulse Check</span>
              </div>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Sends: <em>"How was everything?"</em> Positive ratings get instant thank you.
                Negative ratings are intercepted privately to owner queue.
              </p>
            </div>

            {/* Step 4 */}
            <div className="rounded-xl border border-accent/40 bg-accent/10 p-3 space-y-1.5 shadow-xs">
              <div className="flex items-center gap-1.5 font-bold text-foreground">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-accent-foreground text-[10px]">
                  4
                </span>
                <span>Stage 2: 24h Review + Reward</span>
              </div>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                24 hours later:{" "}
                <em>"Please review us because reviews help small businesses grow!"</em> with 1-Tap
                Google Link and <strong>{activeDiscountValue}</strong> token.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Step 1: Model & Discount Token Selector */}
      <Card className="p-6 border shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-2">
            <span className="bg-primary/10 text-primary w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center">
              1
            </span>
            <h2 className="font-semibold text-base">
              Select Business Model & Incentive Discount Token
            </h2>
          </div>
          <Badge variant="outline" className="text-xs font-normal">
            Location: {locations.find((l) => l.id === locationId)?.name || "Default"}
          </Badge>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Business Operating Model Selector */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Business Operating Model</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleModelChange("restaurant")}
                className={`p-3.5 rounded-lg border text-left flex flex-col justify-between transition ${
                  businessModel === "restaurant"
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center gap-2 font-medium text-sm mb-1">
                  <Utensils className="w-4 h-4 text-amber-600" />
                  <span>Restaurant / Walk-In</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  Daily or weekly POS exports (Toast, Square, Clover). Visits & orders.
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleModelChange("appointment")}
                className={`p-3.5 rounded-lg border text-left flex flex-col justify-between transition ${
                  businessModel === "appointment"
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center gap-2 font-medium text-sm mb-1">
                  <CalendarDays className="w-4 h-4 text-emerald-600" />
                  <span>Appointments & Calendar</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  Salons, Spas, Dentists, Auto Repair. Daily calendar exports.
                </span>
              </button>
            </div>
          </div>

          {/* Discount Token Dropdown */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Gift className="w-4 h-4 text-primary" /> 24-Hour Review Incentive Token
              </span>
              <span className="text-xs text-muted-foreground">Owner Selected</span>
            </Label>
            <Select value={discountToken} onValueChange={setDiscountToken}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select discount token" />
              </SelectTrigger>
              <SelectContent>
                {(businessModel === "restaurant"
                  ? RESTAURANT_DISCOUNTS
                  : APPOINTMENT_DISCOUNTS
                ).map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {discountToken === "Custom Discount Reward" && (
              <Input
                placeholder="e.g., Free Specialty Drink on Next Visit"
                value={customDiscountText}
                onChange={(e) => setCustomDiscountText(e.target.value)}
                className="mt-2 text-sm"
              />
            )}

            <p className="text-xs text-muted-foreground">
              Included in Stage 2 follow-up outreach email:{" "}
              <strong className="text-foreground">"{activeDiscountValue}"</strong>
            </p>
          </div>
        </div>
      </Card>

      {/* Step 2: Ingestion Method */}
      <Card className="p-6 border shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b pb-3">
          <span className="bg-primary/10 text-primary w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center">
            2
          </span>
          <h2 className="font-semibold text-base">
            Upload or Paste{" "}
            {businessModel === "restaurant" ? "POS Customer List" : "Appointment List"}
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 cursor-pointer hover:bg-muted/40 transition min-h-44 text-center">
            <FileText className="w-8 h-8 text-primary/70 mb-2" />
            <span className="text-sm font-semibold">
              Drop {businessModel === "restaurant" ? "POS export CSV" : "Calendar appointment CSV"}
            </span>
            <span className="text-xs text-muted-foreground mt-1">
              {businessModel === "restaurant"
                ? "Toast, Square, Clover, Lightspeed CSV"
                : "Mindbody, Boulevard, Acuity, Google Calendar CSV"}
            </span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFile(f);
              }}
            />
          </label>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
              <Copy className="w-3.5 h-3.5" /> Or Paste Raw Text
            </Label>
            <textarea
              className="w-full h-36 rounded-lg border bg-background px-3 py-2 text-xs font-mono resize-none focus:ring-1 focus:ring-primary"
              placeholder={
                businessModel === "restaurant"
                  ? `name,email,phone,visit_date\nAlex Miller,alex@example.com,555-0192,2026-08-12`
                  : `client_name,email,phone,appointment_date,service\nSarah Parker,sarah@example.com,555-0144,2026-08-13,Hair Styling`
              }
              value={rawText}
              onChange={(e) => parseInput(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Step 3: Column Mapping */}
      {headers.length > 0 && (
        <Card className="p-6 border shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <span className="bg-primary/10 text-primary w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center">
                3
              </span>
              <h2 className="font-semibold text-base">Confirm Column Mapping</h2>
            </div>
            <Badge variant="secondary">
              {rows.length} row{rows.length === 1 ? "" : "s"}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {headers.map((h, i) => (
              <div
                key={i}
                className="flex items-center gap-3 border rounded-lg px-3 py-2 bg-muted/20"
              >
                <span className="text-xs font-mono flex-1 truncate font-medium">{h}</span>
                <Select
                  value={mapping[i] || "ignore"}
                  onValueChange={(v) =>
                    setMapping((prev) => ({
                      ...prev,
                      [i]: v === "ignore" ? "" : (v as Field),
                    }))
                  }
                >
                  <SelectTrigger className="w-52 h-8 text-xs">
                    <SelectValue placeholder="Ignore" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ignore">Ignore</SelectItem>
                    {(Object.keys(FIELD_LABELS) as Array<keyof typeof FIELD_LABELS>).map((f) => (
                      <SelectItem key={f} value={f}>
                        {FIELD_LABELS[f]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          <div className="pt-2 flex items-center gap-3">
            <Button onClick={runPreview} disabled={!canPreview || previewing} className="gap-2">
              {previewing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UserCheck className="w-4 h-4" />
              )}
              Interpret & Check Existing Reviews
            </Button>
            {!canPreview && (
              <span className="text-xs text-amber-600 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Map Email or Phone
              </span>
            )}
          </div>
        </Card>
      )}

      {/* Step 4: Interpreted Review & Ingestion Preview */}
      {previewData && (
        <Card className="p-6 border shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3 flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className="bg-primary/10 text-primary w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center">
                4
              </span>
              <h2 className="font-semibold text-base">Interpreted Batch & Review Status</h2>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white">
                {previewData.new_count} Eligible for Outreach
              </Badge>
              {previewData.crossed_off_positive > 0 && (
                <Badge
                  variant="secondary"
                  className="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200"
                >
                  {previewData.crossed_off_positive} Crossed Off (4-5★ Review Exists)
                </Badge>
              )}
              {previewData.crossed_off_critical > 0 && (
                <Badge
                  variant="secondary"
                  className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                >
                  {previewData.crossed_off_critical} Crossed Off (1-3★ Routed to Owner)
                </Badge>
              )}
              {previewData.duplicate_existing > 0 && (
                <Badge variant="outline">{previewData.duplicate_existing} Already On File</Badge>
              )}
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden max-h-96 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted sticky top-0 font-medium text-muted-foreground">
                <tr>
                  <th className="text-left px-3.5 py-2.5">Review / Ingestion Status</th>
                  <th className="text-left px-3.5 py-2.5">Name</th>
                  <th className="text-left px-3.5 py-2.5">Email</th>
                  <th className="text-left px-3.5 py-2.5">Phone</th>
                  <th className="text-left px-3.5 py-2.5">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {previewData.rows.map((p) => (
                  <tr key={p.idx} className="hover:bg-muted/20">
                    <td className="px-3.5 py-2">
                      {p.status === "new" && (
                        <Badge className="bg-emerald-600 hover:bg-emerald-600 text-[10px] font-medium">
                          Queue 2-Stage Outreach
                        </Badge>
                      )}
                      {p.status === "review_exists_positive" && (
                        <Badge className="bg-blue-600 hover:bg-blue-600 text-white text-[10px] font-medium">
                          Crossed Off (4-5★ Responded)
                        </Badge>
                      )}
                      {p.status === "review_exists_critical" && (
                        <Badge className="bg-amber-600 hover:bg-amber-600 text-white text-[10px] font-medium">
                          Crossed Off (Routed to Owner)
                        </Badge>
                      )}
                      {p.status === "duplicate_existing" && (
                        <Badge variant="outline" className="text-[10px]">
                          Already On File
                        </Badge>
                      )}
                      {p.status === "duplicate_batch" && (
                        <Badge variant="outline" className="text-[10px]">
                          Duplicate in File
                        </Badge>
                      )}
                      {p.status === "invalid" && (
                        <Badge variant="destructive" className="text-[10px]">
                          Invalid
                        </Badge>
                      )}
                    </td>
                    <td className="px-3.5 py-2 font-mono">{p.row.full_name ?? "—"}</td>
                    <td className="px-3.5 py-2 font-mono">{p.row.email ?? "—"}</td>
                    <td className="px-3.5 py-2 font-mono">{p.row.phone ?? "—"}</td>
                    <td className="px-3.5 py-2 font-mono">
                      {p.row.transaction_at
                        ? new Date(p.row.transaction_at).toLocaleDateString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pt-2">
            <Button
              onClick={runImport}
              disabled={importing || previewData.new_count === 0}
              className="gap-2"
            >
              {importing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UploadCloud className="w-4 h-4" />
              )}
              Confirm & Import {previewData.new_count} Eligible Contact
              {previewData.new_count === 1 ? "" : "s"}
            </Button>
          </div>
        </Card>
      )}

      {/* Step 5: Sequence Launch Card */}
      {lastImport && lastImport.inserted_ids.length > 0 && (
        <Card className="p-6 border shadow-sm space-y-4 bg-primary/5 border-primary/20">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-base">5. Launch 2-Stage Outreach Sequence</h2>
          </div>

          {/* Sequence Breakdown Card */}
          <div className="bg-background rounded-xl p-4 border space-y-3 text-xs">
            <div className="flex items-center justify-between font-semibold border-b pb-2 text-sm">
              <span>Active Sequence Plan</span>
              <Badge variant="secondary" className="font-mono">
                Incentive: {lastImport.discount_token}
              </Badge>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1.5 border-r pr-3">
                <div className="font-semibold text-primary flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Stage 1 (Initial Pulse): Immediate
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Sends pulse inquiry: <em>"How was everything during your recent visit?"</em>
                </p>
                <ul className="list-disc list-inside text-[11px] text-muted-foreground pt-1 space-y-0.5">
                  <li>1–3★ negative responses: Direct to owner ("Make-It-Right")</li>
                  <li>4–5★ positive responses: Thank customer immediately</li>
                </ul>
              </div>

              <div className="space-y-1.5">
                <div className="font-semibold text-primary flex items-center gap-1">
                  <Gift className="w-3.5 h-3.5" /> Stage 2 (Google Review + Token): +24 Hours Later
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Automated email:{" "}
                  <em>
                    "Please review us because reviews help small businesses grow! Here is your
                    token: {lastImport.discount_token}"
                  </em>
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button
              onClick={sendInvites}
              disabled={sending || !!lastSend}
              size="lg"
              className="gap-2"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {lastSend
                ? "Sequence Launched!"
                : `Queue Sequence for ${lastImport.inserted_ids.length} Contact${lastImport.inserted_ids.length === 1 ? "" : "s"}`}
            </Button>
            {lastSend && (
              <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white px-3 py-1">
                {lastSend.queued} initial pulse invite{lastSend.queued === 1 ? "" : "s"} queued
              </Badge>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
