-- V4 staging: company self-registration is an application, never an automatic tenant grant.
-- Review and approval are restricted to authenticated platform administrators.
BEGIN;
CREATE TABLE IF NOT EXISTS company_applications (
  id text PRIMARY KEY,
  organization_name text NOT NULL CHECK(length(btrim(organization_name)) BETWEEN 3 AND 160),
  domain text NOT NULL CHECK(domain=lower(domain) AND domain ~ '^[a-z0-9-]+([.][a-z0-9-]+)+$'),
  contact_name text NOT NULL CHECK(length(btrim(contact_name)) BETWEEN 2 AND 100),
  contact_email text NOT NULL CHECK(contact_email=lower(contact_email) AND length(contact_email)<=255),
  country_code text NOT NULL CHECK(country_code ~ '^[A-Z]{2}$'),
  country_name text NOT NULL CHECK(length(btrim(country_name)) BETWEEN 2 AND 80),
  city text NOT NULL CHECK(length(btrim(city)) BETWEEN 2 AND 100),
  website text CHECK(website IS NULL OR length(website)<=300),
  employee_band text NOT NULL CHECK(employee_band IN ('1-50','51-200','201-1000','1000+')),
  message text NOT NULL DEFAULT '' CHECK(length(message)<=2000),
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
  review_note text NOT NULL DEFAULT '' CHECK(length(review_note)<=2000),
  reviewed_by text REFERENCES users(id),
  reviewed_at timestamptz,
  organization_id text REFERENCES organizations(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((status='pending' AND reviewed_by IS NULL AND reviewed_at IS NULL AND organization_id IS NULL)
      OR (status='approved' AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL AND organization_id IS NOT NULL)
      OR (status='rejected' AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL AND organization_id IS NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS company_applications_one_pending_domain_idx ON company_applications(domain) WHERE status='pending';
CREATE INDEX IF NOT EXISTS company_applications_recent_idx ON company_applications(status,created_at DESC);
COMMIT;
