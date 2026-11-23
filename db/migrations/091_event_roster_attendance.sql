-- Event-level attendance: registered roster marks and additional walk-in employees.
CREATE TABLE IF NOT EXISTS v3_attendance_marks (
 event_id text NOT NULL REFERENCES events(id) ON DELETE CASCADE,
 user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 status text NOT NULL CHECK(status IN ('present','absent')),
 marked_by text NOT NULL REFERENCES users(id),
 marked_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(event_id,user_id)
);
CREATE TABLE IF NOT EXISTS v3_attendance_walkins (
 event_id text NOT NULL REFERENCES events(id) ON DELETE CASCADE,
 employee_id text NOT NULL,
 phone text NOT NULL,
 added_by text NOT NULL REFERENCES users(id),
 added_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(event_id,employee_id)
);
CREATE INDEX IF NOT EXISTS v3_attendance_marks_event_idx ON v3_attendance_marks(event_id);
