ALTER TABLE public.response_drafts
  ADD COLUMN IF NOT EXISTS platform_response_id text,
  ADD COLUMN IF NOT EXISTS post_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS post_error text,
  ADD COLUMN IF NOT EXISTS last_post_attempt_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_response_drafts_due
  ON public.response_drafts (scheduled_post_at)
  WHERE status IN ('approved','auto_approved') AND posted_at IS NULL;