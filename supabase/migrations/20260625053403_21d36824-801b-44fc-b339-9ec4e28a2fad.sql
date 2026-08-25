
CREATE TABLE public.stripe_webhook_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_id TEXT,
  event_type TEXT NOT NULL,
  simulated BOOLEAN NOT NULL DEFAULT false,
  livemode BOOLEAN,
  action TEXT NOT NULL,
  ok BOOLEAN NOT NULL,
  note TEXT,
  subscription_id TEXT,
  cancel_at_period_end BOOLEAN,
  contract_ends_at TIMESTAMPTZ,
  payload JSONB,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_stripe_webhook_events_org_received
  ON public.stripe_webhook_events(organization_id, received_at DESC);

GRANT SELECT ON public.stripe_webhook_events TO authenticated;
GRANT ALL ON public.stripe_webhook_events TO service_role;

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins can view webhook events"
  ON public.stripe_webhook_events FOR SELECT
  TO authenticated
  USING (public.has_org_role(auth.uid(), organization_id, ARRAY['owner','admin']::app_role[]));
