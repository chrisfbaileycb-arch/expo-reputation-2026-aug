
-- response_policies: one row per org defining auto-response behavior
CREATE TABLE public.response_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  auto_post_min_rating INT NOT NULL DEFAULT 4 CHECK (auto_post_min_rating BETWEEN 1 AND 5),
  auto_post_delay_minutes INT NOT NULL DEFAULT 15 CHECK (auto_post_delay_minutes >= 0),
  require_approval_max_rating INT NOT NULL DEFAULT 3 CHECK (require_approval_max_rating BETWEEN 1 AND 5),
  brand_voice TEXT NOT NULL DEFAULT 'Warm, professional, concise. Thank the reviewer by first name when given. Never argue. Never offer compensation in writing. For negative reviews, acknowledge, apologize for the experience, and invite them to a private channel.',
  signature TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.response_policies TO authenticated;
GRANT ALL ON public.response_policies TO service_role;
ALTER TABLE public.response_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read response_policies"
  ON public.response_policies FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "managers write response_policies"
  ON public.response_policies FOR ALL TO authenticated
  USING (public.has_org_role(auth.uid(), organization_id, ARRAY['owner','admin','manager']::app_role[]))
  WITH CHECK (public.has_org_role(auth.uid(), organization_id, ARRAY['owner','admin','manager']::app_role[]));

CREATE TRIGGER trg_response_policies_updated_at
  BEFORE UPDATE ON public.response_policies
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- notification_rules: per-org alert preferences
CREATE TABLE public.notification_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('new_review','low_rating_review','policy_violation','draft_needs_approval','draft_posted')),
  channel TEXT NOT NULL CHECK (channel IN ('email','sms','in_app')),
  recipient TEXT NOT NULL,
  min_rating INT CHECK (min_rating BETWEEN 1 AND 5),
  max_rating INT CHECK (max_rating BETWEEN 1 AND 5),
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_rules TO authenticated;
GRANT ALL ON public.notification_rules TO service_role;
ALTER TABLE public.notification_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read notification_rules"
  ON public.notification_rules FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "managers write notification_rules"
  ON public.notification_rules FOR ALL TO authenticated
  USING (public.has_org_role(auth.uid(), organization_id, ARRAY['owner','admin','manager']::app_role[]))
  WITH CHECK (public.has_org_role(auth.uid(), organization_id, ARRAY['owner','admin','manager']::app_role[]));

CREATE TRIGGER trg_notification_rules_updated_at
  BEFORE UPDATE ON public.notification_rules
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX idx_notification_rules_org_event ON public.notification_rules(organization_id, event_type) WHERE enabled = true;

-- response_drafts: AI-generated draft replies awaiting decision
CREATE TABLE public.response_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  draft_body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_approval'
    CHECK (status IN ('pending_approval','auto_approved','approved','rejected','posted','copy_for_yelp')),
  scheduled_post_at TIMESTAMPTZ,
  posted_at TIMESTAMPTZ,
  posted_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,
  model_used TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.response_drafts TO authenticated;
GRANT ALL ON public.response_drafts TO service_role;
ALTER TABLE public.response_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read response_drafts"
  ON public.response_drafts FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "managers write response_drafts"
  ON public.response_drafts FOR ALL TO authenticated
  USING (public.has_org_role(auth.uid(), organization_id, ARRAY['owner','admin','manager']::app_role[]))
  WITH CHECK (public.has_org_role(auth.uid(), organization_id, ARRAY['owner','admin','manager']::app_role[]));

CREATE TRIGGER trg_response_drafts_updated_at
  BEFORE UPDATE ON public.response_drafts
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX idx_response_drafts_org_status ON public.response_drafts(organization_id, status);
CREATE INDEX idx_response_drafts_review ON public.response_drafts(review_id);
