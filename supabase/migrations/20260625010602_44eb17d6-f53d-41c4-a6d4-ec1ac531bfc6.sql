CREATE TABLE IF NOT EXISTS public.posting_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  draft_id uuid REFERENCES public.response_drafts(id) ON DELETE SET NULL,
  review_id uuid REFERENCES public.reviews(id) ON DELETE SET NULL,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  platform text NOT NULL,
  endpoint text,
  http_status integer,
  success boolean NOT NULL,
  error_message text,
  platform_response_id text,
  attempt_number integer NOT NULL DEFAULT 1,
  duration_ms integer,
  response_snippet text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.posting_attempts TO authenticated;
GRANT ALL ON public.posting_attempts TO service_role;

ALTER TABLE public.posting_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org admins read posting_attempts"
  ON public.posting_attempts FOR SELECT
  TO authenticated
  USING (public.has_org_role(auth.uid(), organization_id, ARRAY['owner'::app_role,'admin'::app_role]));

CREATE INDEX IF NOT EXISTS idx_posting_attempts_org_created
  ON public.posting_attempts (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posting_attempts_draft
  ON public.posting_attempts (draft_id);