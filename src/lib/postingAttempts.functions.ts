import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const ListInput = z.object({
  organization_id: z.string().uuid(),
  limit: z.number().int().min(1).max(500).optional(),
  success: z.boolean().optional(),
  platform: z.string().optional(),
});

/**
 * List the most recent posting attempts for the caller's org.
 * RLS already restricts rows to owners/admins; we still pass organization_id
 * explicitly so the UI can filter when a user has access to multiple orgs.
 */
export const listPostingAttempts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => ListInput.parse(i))
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("posting_attempts")
      .select(
        "id, created_at, platform, endpoint, http_status, success, error_message, platform_response_id, attempt_number, duration_ms, response_snippet, draft_id, review_id, location_id",
      )
      .eq("organization_id", data.organization_id)
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 100);
    if (typeof data.success === "boolean") q = q.eq("success", data.success);
    if (data.platform) q = q.eq("platform", data.platform);

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
