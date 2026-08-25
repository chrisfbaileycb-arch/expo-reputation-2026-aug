
-- Enums
CREATE TYPE public.app_role AS ENUM ('owner','admin','manager','viewer');
CREATE TYPE public.review_platform AS ENUM ('google','yelp','facebook','manual','other');
CREATE TYPE public.review_status AS ENUM ('new','responded','ignored','escalated','resolved');
CREATE TYPE public.violation_severity AS ENUM ('low','medium','high','critical');
CREATE TYPE public.removal_status AS ENUM ('draft','submitted','under_review','removed','denied','appeal_pending');
CREATE TYPE public.plan_tier AS ENUM ('foundation','growth','authority');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Organizations
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  plan plan_tier NOT NULL DEFAULT 'foundation',
  billing_status TEXT NOT NULL DEFAULT 'trial',
  contract_starts_at TIMESTAMPTZ,
  contract_ends_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- User roles (separate table — never store role on profile)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, organization_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Security-definer role check
CREATE OR REPLACE FUNCTION public.has_org_role(_user_id UUID, _org_id UUID, _roles app_role[])
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND organization_id = _org_id AND role = ANY(_roles)
  )
$$;

CREATE OR REPLACE FUNCTION public.is_org_member(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND organization_id = _org_id)
$$;

-- Org policies (after function exists)
CREATE POLICY "Members view their orgs" ON public.organizations FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), id));
CREATE POLICY "Owners update org" ON public.organizations FOR UPDATE TO authenticated USING (public.has_org_role(auth.uid(), id, ARRAY['owner','admin']::app_role[]));
CREATE POLICY "Anyone can create org" ON public.organizations FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Owners delete org" ON public.organizations FOR DELETE TO authenticated USING (public.has_org_role(auth.uid(), id, ARRAY['owner']::app_role[]));

-- Locations
CREATE TABLE public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  region TEXT,
  postal_code TEXT,
  phone TEXT,
  google_place_id TEXT,
  yelp_business_id TEXT,
  facebook_page_id TEXT,
  industry TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.locations TO authenticated;
GRANT ALL ON public.locations TO service_role;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view org locations" ON public.locations FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Managers manage locations" ON public.locations FOR ALL TO authenticated
  USING (public.has_org_role(auth.uid(), organization_id, ARRAY['owner','admin','manager']::app_role[]))
  WITH CHECK (public.has_org_role(auth.uid(), organization_id, ARRAY['owner','admin','manager']::app_role[]));

-- Reviews
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations ON DELETE CASCADE,
  platform review_platform NOT NULL,
  platform_review_id TEXT,
  author_name TEXT,
  author_avatar_url TEXT,
  rating SMALLINT CHECK (rating BETWEEN 1 AND 5),
  body TEXT,
  posted_at TIMESTAMPTZ,
  status review_status NOT NULL DEFAULT 'new',
  language TEXT,
  source_url TEXT,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX reviews_org_posted_idx ON public.reviews (organization_id, posted_at DESC);
CREATE INDEX reviews_location_idx ON public.reviews (location_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view org reviews" ON public.reviews FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Managers manage reviews" ON public.reviews FOR ALL TO authenticated
  USING (public.has_org_role(auth.uid(), organization_id, ARRAY['owner','admin','manager']::app_role[]))
  WITH CHECK (public.has_org_role(auth.uid(), organization_id, ARRAY['owner','admin','manager']::app_role[]));

-- Review responses
CREATE TABLE public.review_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES public.reviews ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations ON DELETE CASCADE,
  body TEXT NOT NULL,
  ai_generated BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.review_responses TO authenticated;
GRANT ALL ON public.review_responses TO service_role;
ALTER TABLE public.review_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view org responses" ON public.review_responses FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Managers manage responses" ON public.review_responses FOR ALL TO authenticated
  USING (public.has_org_role(auth.uid(), organization_id, ARRAY['owner','admin','manager']::app_role[]))
  WITH CHECK (public.has_org_role(auth.uid(), organization_id, ARRAY['owner','admin','manager']::app_role[]));

-- Policy violations (auto-flagged TOS violations)
CREATE TABLE public.policy_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES public.reviews ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations ON DELETE CASCADE,
  platform review_platform NOT NULL,
  policy_code TEXT NOT NULL,
  policy_title TEXT NOT NULL,
  policy_url TEXT,
  severity violation_severity NOT NULL DEFAULT 'medium',
  ai_rationale TEXT,
  confidence NUMERIC(3,2),
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  dismissed BOOLEAN NOT NULL DEFAULT false,
  dismissed_reason TEXT
);
CREATE INDEX policy_violations_review_idx ON public.policy_violations (review_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.policy_violations TO authenticated;
GRANT ALL ON public.policy_violations TO service_role;
ALTER TABLE public.policy_violations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view org violations" ON public.policy_violations FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Managers manage violations" ON public.policy_violations FOR ALL TO authenticated
  USING (public.has_org_role(auth.uid(), organization_id, ARRAY['owner','admin','manager']::app_role[]))
  WITH CHECK (public.has_org_role(auth.uid(), organization_id, ARRAY['owner','admin','manager']::app_role[]));

-- Removal requests
CREATE TABLE public.removal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES public.reviews ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations ON DELETE CASCADE,
  violation_id UUID REFERENCES public.policy_violations ON DELETE SET NULL,
  platform review_platform NOT NULL,
  status removal_status NOT NULL DEFAULT 'draft',
  appeal_body TEXT NOT NULL,
  submission_url TEXT,
  submitted_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  outcome_notes TEXT,
  submitted_by UUID REFERENCES auth.users,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX removal_requests_org_idx ON public.removal_requests (organization_id, status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.removal_requests TO authenticated;
GRANT ALL ON public.removal_requests TO service_role;
ALTER TABLE public.removal_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view org removals" ON public.removal_requests FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Managers manage removals" ON public.removal_requests FOR ALL TO authenticated
  USING (public.has_org_role(auth.uid(), organization_id, ARRAY['owner','admin','manager']::app_role[]))
  WITH CHECK (public.has_org_role(auth.uid(), organization_id, ARRAY['owner','admin','manager']::app_role[]));

-- Request campaigns
CREATE TABLE public.request_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations ON DELETE CASCADE,
  location_id UUID REFERENCES public.locations ON DELETE SET NULL,
  name TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'sms',
  message_template TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  sent_count INTEGER NOT NULL DEFAULT 0,
  clicked_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.request_campaigns TO authenticated;
GRANT ALL ON public.request_campaigns TO service_role;
ALTER TABLE public.request_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view org campaigns" ON public.request_campaigns FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Managers manage campaigns" ON public.request_campaigns FOR ALL TO authenticated
  USING (public.has_org_role(auth.uid(), organization_id, ARRAY['owner','admin','manager']::app_role[]))
  WITH CHECK (public.has_org_role(auth.uid(), organization_id, ARRAY['owner','admin','manager']::app_role[]));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.tg_set_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER set_updated_at_profiles BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER set_updated_at_organizations BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER set_updated_at_locations BEFORE UPDATE ON public.locations FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER set_updated_at_reviews BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER set_updated_at_review_responses BEFORE UPDATE ON public.review_responses FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER set_updated_at_removal_requests BEFORE UPDATE ON public.removal_requests FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER set_updated_at_request_campaigns BEFORE UPDATE ON public.request_campaigns FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
