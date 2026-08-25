import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { createHash } from "crypto";

const RawRow = z.object({
  full_name: z.string().trim().max(200).optional().nullable(),
  email: z.string().trim().max(320).optional().nullable(),
  phone: z.string().trim().max(64).optional().nullable(),
  transaction_at: z.string().trim().max(64).optional().nullable(),
  service_type: z.string().trim().max(200).optional().nullable(), // For appointment/calendar mode
});

const PreviewInput = z.object({
  location_id: z.string().uuid(),
  business_model: z.enum(["restaurant", "appointment"]).default("restaurant"),
  discount_token: z.string().default("10% Off Next Meal"),
  rows: z.array(RawRow).min(1).max(5000),
});

const ImportInput = PreviewInput.extend({
  skip_duplicates: z.boolean().default(true),
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function normEmail(v?: string | null) {
  const s = (v ?? "").trim().toLowerCase();
  return s && EMAIL_RE.test(s) ? s : null;
}

function normPhone(v?: string | null) {
  const digits = (v ?? "").replace(/\D+/g, "");
  if (digits.length < 7 || digits.length > 15) return null;
  return digits;
}

function normDate(v?: string | null): string | null {
  if (!v) return null;
  const d = new Date(v);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

function dedupHash(email: string | null, phone: string | null, name: string | null) {
  const key = email || phone || (name ?? "").toLowerCase().trim();
  return createHash("sha256").update(key).digest("hex").slice(0, 32);
}

type Prepared = {
  ok: boolean;
  reason?: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  transaction_at: string | null;
  service_type: string | null;
  dedup_hash: string;
};

function prepare(rows: z.infer<typeof RawRow>[]): Prepared[] {
  return rows.map((r) => {
    const email = normEmail(r.email);
    const phone = normPhone(r.phone);
    const name = (r.full_name ?? "").trim() || null;
    const service = (r.service_type ?? "").trim() || null;
    if (!email && !phone) {
      return {
        ok: false,
        reason: "Missing valid email and phone",
        full_name: name,
        email: null,
        phone: null,
        transaction_at: normDate(r.transaction_at),
        service_type: service,
        dedup_hash: "",
      };
    }
    return {
      ok: true,
      full_name: name,
      email,
      phone,
      transaction_at: normDate(r.transaction_at),
      service_type: service,
      dedup_hash: dedupHash(email, phone, name),
    };
  });
}

export const previewCustomerImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: z.infer<typeof PreviewInput>) => PreviewInput.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: loc, error: locErr } = await supabase
      .from("locations")
      .select("id, organization_id")
      .eq("id", data.location_id)
      .maybeSingle();
    if (locErr || !loc) throw new Error("Location not found");

    const prepared = prepare(data.rows);
    const validHashes = prepared.filter((p) => p.ok).map((p) => p.dedup_hash);
    const validEmails = prepared.filter((p) => p.ok && p.email).map((p) => p.email as string);
    const seenInBatch = new Set<string>();
    const batchDupes = new Set<string>();
    for (const h of validHashes) {
      if (seenInBatch.has(h)) batchDupes.add(h);
      seenInBatch.add(h);
    }

    let existing = new Set<string>();
    if (validHashes.length) {
      const { data: hits } = await supabase
        .from("customer_contacts")
        .select("dedup_hash")
        .eq("organization_id", loc.organization_id)
        .in("dedup_hash", validHashes);
      existing = new Set((hits ?? []).map((h: { dedup_hash: string }) => h.dedup_hash));
    }

    // Check if any uploaded contacts ALREADY submitted a review or feedback!
    // Positive reviews (4-5 stars) -> Cross off & auto-thanked.
    // Critical reviews (1-3 stars) -> Cross off & routed to owner.
    const reviewedEmailsPositive = new Set<string>();
    const reviewedEmailsCritical = new Set<string>();

    if (validEmails.length) {
      const { data: feedbackHits } = await supabase
        .from("feedback_submissions")
        .select("rating, customer_contacts!inner(email)")
        .eq("organization_id", loc.organization_id);

      if (feedbackHits) {
        for (const item of feedbackHits) {
          const contactObj = item.customer_contacts as unknown as { email?: string } | null;
          const email = contactObj?.email?.toLowerCase();
          if (email && validEmails.includes(email)) {
            if (item.rating >= 4) {
              reviewedEmailsPositive.add(email);
            } else {
              reviewedEmailsCritical.add(email);
            }
          }
        }
      }
    }

    const preview = prepared.map((p, idx) => {
      if (!p.ok) return { idx, status: "invalid" as const, reason: p.reason, row: p };

      const emailLower = (p.email ?? "").toLowerCase();
      if (reviewedEmailsPositive.has(emailLower)) {
        return {
          idx,
          status: "review_exists_positive" as const,
          reason: "Review on file (4-5★) — Crossed off & auto-thanked",
          row: p,
        };
      }
      if (reviewedEmailsCritical.has(emailLower)) {
        return {
          idx,
          status: "review_exists_critical" as const,
          reason: "Review on file (1-3★) — Crossed off & routed to owner queue",
          row: p,
        };
      }

      if (existing.has(p.dedup_hash)) return { idx, status: "duplicate_existing" as const, row: p };
      if (batchDupes.has(p.dedup_hash)) return { idx, status: "duplicate_batch" as const, row: p };
      return { idx, status: "new" as const, row: p };
    });

    return {
      total: prepared.length,
      new_count: preview.filter((p) => p.status === "new").length,
      crossed_off_positive: preview.filter((p) => p.status === "review_exists_positive").length,
      crossed_off_critical: preview.filter((p) => p.status === "review_exists_critical").length,
      duplicate_existing: preview.filter((p) => p.status === "duplicate_existing").length,
      duplicate_batch: preview.filter((p) => p.status === "duplicate_batch").length,
      invalid: preview.filter((p) => p.status === "invalid").length,
      business_model: data.business_model,
      discount_token: data.discount_token,
      rows: preview.slice(0, 500),
    };
  });

export const importCustomers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: z.infer<typeof ImportInput>) => ImportInput.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: loc, error: locErr } = await supabase
      .from("locations")
      .select("id, organization_id")
      .eq("id", data.location_id)
      .maybeSingle();
    if (locErr || !loc) throw new Error("Location not found");

    const prepared = prepare(data.rows);
    const valid = prepared.filter((p) => p.ok);

    const seen = new Set<string>();
    const uniqueBatch = valid.filter((p) => {
      if (seen.has(p.dedup_hash)) return false;
      seen.add(p.dedup_hash);
      return true;
    });

    if (!uniqueBatch.length) {
      return {
        inserted: 0,
        skipped: prepared.length,
        invalid: prepared.length - valid.length,
        inserted_ids: [] as string[],
        organization_id: loc.organization_id,
        business_model: data.business_model,
        discount_token: data.discount_token,
      };
    }

    const payload = uniqueBatch.map((p) => ({
      organization_id: loc.organization_id,
      location_id: loc.id,
      full_name: p.full_name,
      email: p.email,
      phone: p.phone,
      transaction_at: p.transaction_at,
      dedup_hash: p.dedup_hash,
      source: data.business_model === "appointment" ? "calendar_import" : "pos_csv",
    }));

    const { data: inserted, error } = await supabase
      .from("customer_contacts")
      .upsert(payload, {
        onConflict: "organization_id,dedup_hash",
        ignoreDuplicates: data.skip_duplicates,
      })
      .select("id");

    if (error) throw new Error(error.message);

    return {
      inserted: inserted?.length ?? 0,
      skipped: uniqueBatch.length - (inserted?.length ?? 0),
      invalid: prepared.length - valid.length,
      inserted_ids: (inserted ?? []).map((r) => r.id),
      organization_id: loc.organization_id,
      business_model: data.business_model,
      discount_token: data.discount_token,
    };
  });
