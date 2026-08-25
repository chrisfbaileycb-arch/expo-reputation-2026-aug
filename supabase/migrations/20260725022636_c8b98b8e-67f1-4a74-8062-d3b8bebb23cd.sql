
CREATE OR REPLACE FUNCTION public.grant_owner_on_org_create()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.created_by IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, organization_id, role)
    VALUES (NEW.created_by, NEW.id, 'owner'::app_role)
    ON CONFLICT (user_id, organization_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_grant_owner_on_org_create ON public.organizations;
CREATE TRIGGER trg_grant_owner_on_org_create
AFTER INSERT ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.grant_owner_on_org_create();

-- Backfill: ensure every existing org creator has the owner role
INSERT INTO public.user_roles (user_id, organization_id, role)
SELECT o.created_by, o.id, 'owner'::app_role
FROM public.organizations o
WHERE o.created_by IS NOT NULL
ON CONFLICT DO NOTHING;
