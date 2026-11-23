-- Track event submission even when no registered employees attended.
CREATE TABLE IF NOT EXISTS v3_attendance_submissions (
 event_id text PRIMARY KEY REFERENCES events(id) ON DELETE CASCADE,
 submitted_by text NOT NULL REFERENCES users(id),
 submitted_at timestamptz NOT NULL DEFAULT now()
);
-- State-scoped visibility for existing company employees added as extras.
ALTER TABLE v3_attendance_walkins ADD COLUMN IF NOT EXISTS state_id text;
CREATE INDEX IF NOT EXISTS v3_attendance_walkins_event_state_idx
 ON v3_attendance_walkins(event_id,state_id);
