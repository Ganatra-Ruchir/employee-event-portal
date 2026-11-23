-- Elixir Employee Volunteer System V4: CSR, impact, attendance and communication.
-- Run only on a NEW Railway staging PostgreSQL database after 001..090.
-- Existing rows are retained; no production migration is authorized by this file.
BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS events_id_organization_uq ON events(id,organization_id);
CREATE UNIQUE INDEX IF NOT EXISTS users_id_organization_uq ON users(id,organization_id);

CREATE TABLE IF NOT EXISTS csr_partners (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 2 AND 180),
  kind text NOT NULL DEFAULT 'ngo' CHECK (kind IN ('ngo','school','government','community','other')),
  contact_email text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','rejected','suspended')),
  verification_notes text NOT NULL DEFAULT '' CHECK (length(verification_notes)<=2000),
  verified_by text REFERENCES users(id),
  verified_at timestamptz,
  created_by text NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id,organization_id),
  CHECK ((verified_by IS NULL AND verified_at IS NULL) OR (verified_by IS NOT NULL AND verified_at IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS csr_partners_org_status_idx ON csr_partners(organization_id,status);

CREATE TABLE IF NOT EXISTS csr_campaigns (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES organizations(id),
  country_code text NOT NULL,
  state_id text,
  branch_id text,
  partner_id text,
  title text NOT NULL CHECK(length(btrim(title)) BETWEEN 3 AND 180),
  description text NOT NULL DEFAULT '',
  primary_sdg integer CHECK(primary_sdg BETWEEN 1 AND 17),
  starts_on date NOT NULL,
  ends_on date NOT NULL,
  budget_inr numeric(14,2) NOT NULL DEFAULT 0 CHECK(budget_inr>=0),
  target_beneficiaries integer CHECK(target_beneficiaries>=0),
  status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','active','completed','archived')),
  created_by text NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(id,organization_id),
  FOREIGN KEY(organization_id,country_code) REFERENCES v3_countries(organization_id,code),
  FOREIGN KEY(organization_id,country_code,state_id) REFERENCES v3_states(organization_id,country_code,id),
  FOREIGN KEY(organization_id,country_code,state_id,branch_id) REFERENCES v3_branches(organization_id,country_code,state_id,id),
  FOREIGN KEY(partner_id,organization_id) REFERENCES csr_partners(id,organization_id),
  CHECK(ends_on>=starts_on),
  CHECK(branch_id IS NULL OR state_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS csr_campaigns_scope_idx ON csr_campaigns(organization_id,country_code,state_id,status,starts_on);

CREATE TABLE IF NOT EXISTS csr_campaign_events (
  campaign_id text NOT NULL,
  event_id text NOT NULL,
  organization_id text NOT NULL,
  PRIMARY KEY(campaign_id,event_id),
  FOREIGN KEY(campaign_id,organization_id) REFERENCES csr_campaigns(id,organization_id) ON DELETE CASCADE,
  FOREIGN KEY(event_id,organization_id) REFERENCES events(id,organization_id) ON DELETE CASCADE
);

-- No row means company-wide access (legacy behavior).
-- Optional rows narrow an event; invited audience is explicit and defaults to no one.
CREATE TABLE IF NOT EXISTS event_audiences (
  event_id text PRIMARY KEY,
  organization_id text NOT NULL,
  audience text NOT NULL CHECK(audience IN ('company','country','state','branch','invited')),
  country_code text,
  state_id text,
  branch_id text,
  updated_by text NOT NULL REFERENCES users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(event_id,organization_id) REFERENCES events(id,organization_id) ON DELETE CASCADE,
  FOREIGN KEY(organization_id,country_code) REFERENCES v3_countries(organization_id,code),
  FOREIGN KEY(organization_id,country_code,state_id) REFERENCES v3_states(organization_id,country_code,id),
  FOREIGN KEY(organization_id,country_code,state_id,branch_id) REFERENCES v3_branches(organization_id,country_code,state_id,id),
  CHECK ((audience IN ('company','invited') AND country_code IS NULL AND state_id IS NULL AND branch_id IS NULL)
      OR (audience='country' AND country_code IS NOT NULL AND state_id IS NULL AND branch_id IS NULL)
      OR (audience='state' AND country_code IS NOT NULL AND state_id IS NOT NULL AND branch_id IS NULL)
      OR (audience='branch' AND country_code IS NOT NULL AND state_id IS NOT NULL AND branch_id IS NOT NULL))
);
CREATE TABLE IF NOT EXISTS event_invitees (
  event_id text NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invited_by text NOT NULL REFERENCES users(id),
  invited_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(event_id,user_id)
);
CREATE INDEX IF NOT EXISTS event_invitees_user_idx ON event_invitees(user_id,event_id);

CREATE TABLE IF NOT EXISTS event_attendance (
  event_id text NOT NULL,
  user_id text NOT NULL,
  status text NOT NULL CHECK(status IN ('present','absent')),
  checked_in_at timestamptz,
  checked_out_at timestamptz,
  verified_by text NOT NULL REFERENCES users(id),
  verified_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(event_id,user_id),
  FOREIGN KEY(event_id,user_id) REFERENCES registrations(event_id,user_id) ON DELETE CASCADE,
  CHECK(checked_out_at IS NULL OR (checked_in_at IS NOT NULL AND checked_out_at>=checked_in_at))
);
CREATE INDEX IF NOT EXISTS event_attendance_status_idx ON event_attendance(event_id,status);
-- Existing verified contributions are retained and recognized as present.
INSERT INTO event_attendance(event_id,user_id,status,verified_by,verified_at)
  SELECT event_id,user_id,'present',verified_by,verified_at FROM v3_contributions
  ON CONFLICT(event_id,user_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS event_feedback (
  event_id text NOT NULL,
  user_id text NOT NULL,
  rating integer NOT NULL CHECK(rating BETWEEN 1 AND 5),
  comments text NOT NULL DEFAULT '' CHECK(length(comments)<=2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(event_id,user_id),
  FOREIGN KEY(event_id,user_id) REFERENCES registrations(event_id,user_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS volunteer_certificates (
  id text PRIMARY KEY,
  event_id text NOT NULL,
  user_id text NOT NULL,
  certificate_number text NOT NULL UNIQUE,
  issued_by text NOT NULL REFERENCES users(id),
  issued_at timestamptz NOT NULL DEFAULT now(),
  document_storage_key text,
  revoked_at timestamptz,
  revoked_by text REFERENCES users(id),
  UNIQUE(event_id,user_id),
  FOREIGN KEY(event_id,user_id) REFERENCES event_attendance(event_id,user_id)
);

-- Aggregates only: do not place names, phone numbers, Aadhaar numbers or raw beneficiary identifiers here.
CREATE TABLE IF NOT EXISTS csr_impact_records (
  id text PRIMARY KEY,
  organization_id text NOT NULL,
  campaign_id text NOT NULL,
  event_id text,
  metric text NOT NULL CHECK(metric IN ('beneficiaries_reached','sessions_delivered','volunteer_hours','trees_planted','other')),
  metric_label text NOT NULL DEFAULT '' CHECK(length(metric_label)<=120),
  value numeric(14,2) NOT NULL CHECK(value>=0),
  period_start date NOT NULL,
  period_end date NOT NULL,
  evidence_reference text CHECK(length(evidence_reference)<=1000),
  status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','verified','rejected')),
  recorded_by text NOT NULL REFERENCES users(id),
  verified_by text REFERENCES users(id),
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(campaign_id,organization_id) REFERENCES csr_campaigns(id,organization_id),
  FOREIGN KEY(event_id,organization_id) REFERENCES events(id,organization_id),
  CHECK(period_end>=period_start),
  CHECK((status='verified' AND verified_by IS NOT NULL AND verified_at IS NOT NULL)
     OR (status<>'verified' AND verified_at IS NULL))
);
CREATE INDEX IF NOT EXISTS csr_impact_scope_idx ON csr_impact_records(organization_id,campaign_id,status,period_start);

CREATE TABLE IF NOT EXISTS notification_outbox (
  id text PRIMARY KEY,
  recipient_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id text NOT NULL REFERENCES organizations(id),
  event_id text REFERENCES events(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK(kind IN ('event_invitation','registration','event_reminder','attendance','certificate','announcement')),
  channel text NOT NULL CHECK(channel IN ('email','in_app')),
  subject text NOT NULL CHECK(length(subject)<=180),
  body text NOT NULL CHECK(length(body)<=5000),
  delivery_status text NOT NULL DEFAULT 'pending' CHECK(delivery_status IN ('pending','sent','failed','suppressed')),
  attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 50),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notification_pending_idx ON notification_outbox(next_attempt_at) WHERE delivery_status='pending';
CREATE INDEX IF NOT EXISTS notification_recipient_idx ON notification_outbox(recipient_id,created_at DESC);

COMMIT;