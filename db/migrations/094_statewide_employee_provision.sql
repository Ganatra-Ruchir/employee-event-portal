-- A state administrator can provision employees immediately, even before
-- the country administrator creates a city/branch in the new state.
-- Branch is an optional finer-grained assignment; state remains mandatory.
BEGIN;
ALTER TABLE v3_memberships DROP CONSTRAINT IF EXISTS v3_memberships_check;
ALTER TABLE v3_memberships DROP CONSTRAINT IF EXISTS v3_memberships_level_scope_check;
ALTER TABLE v3_memberships ADD CONSTRAINT v3_memberships_level_scope_check CHECK (
 (level='country_admin' AND state_id IS NULL AND branch_id IS NULL) OR
 (level='state_admin' AND state_id IS NOT NULL AND branch_id IS NULL) OR
 (level='employee' AND state_id IS NOT NULL)
);
COMMIT;
