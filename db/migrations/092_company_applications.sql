CREATE TABLE IF NOT EXISTS company_applications (
 id text PRIMARY KEY,
 organization_name text NOT NULL,
 website text NOT NULL DEFAULT '',
 contact_name text NOT NULL,
 contact_email text NOT NULL,
 phone text NOT NULL DEFAULT '',
 work_domain text NOT NULL,
 employee_count text NOT NULL DEFAULT '',
 message text NOT NULL DEFAULT '',
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
 created_at timestamptz NOT NULL DEFAULT now(),
 reviewed_by text REFERENCES users(id),
 reviewed_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS company_applications_pending_email ON company_applications(lower(contact_email)) WHERE status='pending';
