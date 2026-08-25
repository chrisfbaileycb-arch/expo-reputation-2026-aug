
CREATE TABLE public.stripe_readiness (
  organization_id UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  eligibility_status TEXT NOT NULL DEFAULT 'not_run',
  eligibility_checked_at TIMESTAMPTZ,
  eligibility_notes TEXT,
  payments_enabled BOOLEAN NOT NULL DEFAULT false,
  payments_enabled_at TIMESTAMPTZ,
  last_price_batch_at TIMESTAMPTZ,
  last_price_batch_result JSONB NOT NULL DEFAULT '{}'::jsonb,
  webhook_enforcement_active BOOLEAN NOT NULL DEFAULT false,
  webhook_last_event_at TIMESTAMPTZ,
  webhook_notes TEXT,
  llc_checklist JSONB NOT NULL DEFAULT jsonb_build_array(
    jsonb_build_object('key','wy_articles','label','Wyoming Articles of Organization filed','done',false),
    jsonb_build_object('key','wy_approved','label','Wyoming Secretary of State approval received','done',false),
    jsonb_build_object('key','ein_applied','label','IRS EIN application submitted (SS-4)','done',false),
    jsonb_build_object('key','ein_issued','label','EIN issued by IRS','done',false),
    jsonb_build_object('key','operating_agreement','label','Operating Agreement signed (Signal F Holdings LLC)','done',false),
    jsonb_build_object('key','registered_agent','label','Wyoming registered agent confirmed','done',false),
    jsonb_build_object('key','bank_account','label','Business bank account opened in LLC name','done',false),
    jsonb_build_object('key','dba_filed','label','DBA "Expo Proxy Reputation" filed (if used)','done',false),
    jsonb_build_object('key','address_verified','label','Verifiable business address on file','done',false),
    jsonb_build_object('key','beneficial_ownership','label','FinCEN Beneficial Ownership Report filed','done',false)
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stripe_readiness TO authenticated;
GRANT ALL ON public.stripe_readiness TO service_role;

ALTER TABLE public.stripe_readiness ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org owners and admins can view readiness"
  ON public.stripe_readiness FOR SELECT
  TO authenticated
  USING (public.has_org_role(auth.uid(), organization_id, ARRAY['owner','admin']::app_role[]));

CREATE POLICY "Org owners and admins can insert readiness"
  ON public.stripe_readiness FOR INSERT
  TO authenticated
  WITH CHECK (public.has_org_role(auth.uid(), organization_id, ARRAY['owner','admin']::app_role[]));

CREATE POLICY "Org owners and admins can update readiness"
  ON public.stripe_readiness FOR UPDATE
  TO authenticated
  USING (public.has_org_role(auth.uid(), organization_id, ARRAY['owner','admin']::app_role[]))
  WITH CHECK (public.has_org_role(auth.uid(), organization_id, ARRAY['owner','admin']::app_role[]));

CREATE TRIGGER stripe_readiness_set_updated_at
  BEFORE UPDATE ON public.stripe_readiness
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
