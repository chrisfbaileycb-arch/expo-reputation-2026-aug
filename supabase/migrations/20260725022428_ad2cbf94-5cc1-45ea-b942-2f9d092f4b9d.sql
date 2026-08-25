-- Org-scoped RLS lookups
CREATE INDEX IF NOT EXISTS idx_locations_org ON public.locations (organization_id);
CREATE INDEX IF NOT EXISTS idx_policy_violations_org ON public.policy_violations (organization_id);
CREATE INDEX IF NOT EXISTS idx_request_campaigns_org ON public.request_campaigns (organization_id);
CREATE INDEX IF NOT EXISTS idx_review_responses_org ON public.review_responses (organization_id);

-- FK drill-downs / cascade cleanup
CREATE INDEX IF NOT EXISTS idx_request_campaigns_location ON public.request_campaigns (location_id);
CREATE INDEX IF NOT EXISTS idx_review_responses_review ON public.review_responses (review_id);
CREATE INDEX IF NOT EXISTS idx_posting_attempts_review ON public.posting_attempts (review_id);
CREATE INDEX IF NOT EXISTS idx_posting_attempts_location ON public.posting_attempts (location_id);
CREATE INDEX IF NOT EXISTS idx_removal_requests_review ON public.removal_requests (review_id);
CREATE INDEX IF NOT EXISTS idx_removal_requests_violation ON public.removal_requests (violation_id);

-- stripe_readiness is functionally one-per-org; enforce it and get the org lookup index for free
CREATE UNIQUE INDEX IF NOT EXISTS stripe_readiness_org_uidx ON public.stripe_readiness (organization_id);