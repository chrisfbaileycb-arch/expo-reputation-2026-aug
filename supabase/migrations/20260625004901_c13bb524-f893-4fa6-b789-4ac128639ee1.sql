
-- 1. gbp_connections: one per Google account linked by an org
CREATE TABLE public.gbp_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  google_email TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  scopes TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked','error')),
  last_error TEXT,
  connected_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, google_email)
);

GRANT SELECT, UPDATE, DELETE ON public.gbp_connections TO authenticated;
GRANT ALL ON public.gbp_connections TO service_role;

ALTER TABLE public.gbp_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org managers can view their gbp connections"
  ON public.gbp_connections FOR SELECT TO authenticated
  USING (public.has_org_role(auth.uid(), organization_id, ARRAY['owner','manager']::app_role[]));

CREATE POLICY "org managers can delete their gbp connections"
  ON public.gbp_connections FOR DELETE TO authenticated
  USING (public.has_org_role(auth.uid(), organization_id, ARRAY['owner','manager']::app_role[]));

-- Inserts/updates of tokens happen only via service role (server fns), never directly from client.

CREATE TRIGGER trg_gbp_connections_updated
  BEFORE UPDATE ON public.gbp_connections
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 2. gbp_oauth_states: CSRF nonces, service-role only
CREATE TABLE public.gbp_oauth_states (
  state TEXT PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  redirect_to TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '10 minutes'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.gbp_oauth_states TO service_role;

ALTER TABLE public.gbp_oauth_states ENABLE ROW LEVEL SECURITY;
-- No policies for authenticated/anon — service role only.

-- 3. Link a GBP account+location to one of our locations
ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS gbp_connection_id UUID REFERENCES public.gbp_connections(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS gbp_account_id TEXT,
  ADD COLUMN IF NOT EXISTS gbp_location_id TEXT;

CREATE INDEX IF NOT EXISTS idx_locations_gbp_location ON public.locations(gbp_location_id) WHERE gbp_location_id IS NOT NULL;
