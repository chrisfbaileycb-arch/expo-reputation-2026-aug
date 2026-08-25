
-- Add timezone to locations for local-time manager digests
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'America/New_York';

-- Customer contacts (batch CSV + event pipeline converge here)
CREATE TABLE public.customer_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  full_name text,
  email text,
  phone text,
  source text NOT NULL DEFAULT 'csv', -- csv | calendar | manual
  transaction_at timestamptz,
  dedup_hash text NOT NULL,
  unsubscribed_at timestamptz,
  last_outreach_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, dedup_hash)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_contacts TO authenticated;
GRANT ALL ON public.customer_contacts TO service_role;
ALTER TABLE public.customer_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members manage contacts" ON public.customer_contacts FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE INDEX idx_contacts_org ON public.customer_contacts(organization_id);
CREATE INDEX idx_contacts_location ON public.customer_contacts(location_id);
CREATE INDEX idx_contacts_transaction_at ON public.customer_contacts(transaction_at DESC);

-- Outreach messages (per-send log across channels)
CREATE TABLE public.outreach_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.customer_contacts(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  channel text NOT NULL DEFAULT 'email', -- email | sms
  kind text NOT NULL DEFAULT 'request',  -- request | elevation | resolution
  token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'queued', -- queued | sent | failed | opened | clicked
  provider_message_id text,
  scheduled_for timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.outreach_messages TO authenticated;
GRANT ALL ON public.outreach_messages TO service_role;
ALTER TABLE public.outreach_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read outreach" ON public.outreach_messages FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org members write outreach" ON public.outreach_messages FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE INDEX idx_outreach_org ON public.outreach_messages(organization_id);
CREATE INDEX idx_outreach_scheduled ON public.outreach_messages(scheduled_for) WHERE status = 'queued';
CREATE INDEX idx_outreach_contact ON public.outreach_messages(contact_id);

-- Feedback submissions from the smart landing page
CREATE TABLE public.feedback_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES public.customer_contacts(id) ON DELETE SET NULL,
  outreach_message_id uuid REFERENCES public.outreach_messages(id) ON DELETE SET NULL,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  routed_to text NOT NULL, -- intercept | elevate
  clicked_public_link boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.feedback_submissions TO anon;         -- landing page write
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feedback_submissions TO authenticated;
GRANT ALL ON public.feedback_submissions TO service_role;
ALTER TABLE public.feedback_submissions ENABLE ROW LEVEL SECURITY;
-- No anon SELECT policy => anon cannot read; only anon INSERT via server fn using service_role.
CREATE POLICY "org members read feedback" ON public.feedback_submissions FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));
CREATE INDEX idx_feedback_org ON public.feedback_submissions(organization_id);
CREATE INDEX idx_feedback_created ON public.feedback_submissions(created_at DESC);

-- Manager action items (SLA queue for 1-3 star intercepts)
CREATE TABLE public.manager_action_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  feedback_id uuid NOT NULL REFERENCES public.feedback_submissions(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.customer_contacts(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'open', -- open | in_progress | resolved | dismissed
  due_at timestamptz NOT NULL,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_note text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.manager_action_items TO authenticated;
GRANT ALL ON public.manager_action_items TO service_role;
ALTER TABLE public.manager_action_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members manage action items" ON public.manager_action_items FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE INDEX idx_action_org_status ON public.manager_action_items(organization_id, status, due_at);

-- updated_at triggers
CREATE TRIGGER tg_contacts_updated BEFORE UPDATE ON public.customer_contacts
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER tg_outreach_updated BEFORE UPDATE ON public.outreach_messages
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER tg_action_updated BEFORE UPDATE ON public.manager_action_items
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
