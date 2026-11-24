# Neon shared client-demo activation / handover

**Environment:** `https://employee-event-portal.vercel.app`  
**Database:** existing Neon project `elixir-events`, default production branch.  
**Purpose:** a shared, fictional review dataset. This is NOT an import of any reviewer's browser-localStorage and is not authorized for actual employee records.

## Completed (24 November 2026)
- Additive hierarchy, attendance, company application and state-wide employee columns/tables are present in Neon. No existing records were deleted.
- Three fictional organizations: Elixir Foundation, Micron and Microsoft.
- Six states, eight branches, eighty fictional employee-directory placeholders and eight independent role-test accounts.
- Six fictional events, sixty event registrations and twenty verified attendance entries.
- Production Vercel environment keys created: `DATABASE_URL`, `PORTAL_BACKEND_MODE=database`, `PORTAL_V3_ENABLED=true`, `NEXT_PUBLIC_PORTAL_DATABASE_ENABLED=true`, and `BOOTSTRAP_ADMIN_EMAIL`.
- Test-account temporary passwords were created outside the GitHub repository and require first-sign-in rotation.

## Live deployment (verified)

Vercel successfully deployed `main` commit `6241863f` to production, using the new database environment settings. On 24 November 2026, the permanent domain `/api/portal/health` returned HTTP 200 with `{"mode":"postgresql","ready":true}`. Unauthenticated `/api/portal` reported `enabled:true`; company applications returned HTTP 403 without an admin session.

**Database connectivity is verified. Full cross-browser login, event mutation, role isolation and client acceptance still require live authenticated tests.** Follow-up commits add documentation and the optional live smoke test script `scripts/verify-shared-neon.mjs`; these do not change the database connection.

## First root admin
The first root account has not been activated. Use `scripts/issue-first-admin-link.mjs` from a trusted private shell with the direct Neon connection string. Set `BOOTSTRAP_ADMIN_EMAIL` to the same email configured in Vercel, `PORTAL_PUBLIC_URL=https://employee-event-portal.vercel.app`, and `ALLOW_FIRST_ADMIN_INVITE=true`. The script refuses if a root already exists, creates only a hashed 48-hour single-use token, and prints the activation URL privately.

**Never add the URL, password, direct DB URI or temporary credentials to Git, CI logs, public tickets or screenshots.** Send the activation URL to the intended administrator over a private channel only.

## Five-person cross-browser acceptance
1. Log in from five independent browser profiles using five unique temporary role credentials. Every user must set a new password on first sign-in.
2. Verify Company Admin sees only assigned-country hierarchy and employee records.
3. Verify Bihar State Admin sees the shared Bihar state, can add a branch-optional employee, and cannot edit Gujarat or other organizations.
4. Verify Employee sees their own events, registration state, profile and contribution history.
5. Create a fictional event in Company Admin's browser and verify it appears in the authorized employee's browser after refresh, then register and mark attendance.
6. Reopen both browsers and verify persistence. Audit 403 access denials for cross-country/state data.
7. Check responsiveness, latency, email provider delivery and company applications separately.

## Known limitations
- Existing browser-only Bihar records and credentials were not imported. Browser storage cannot be read from another browser or backfilled from screenshots.
- The eighty fictional directory placeholders require the admin to issue credentials before those placeholder users can sign in. Eight role-test accounts have unique one-time credentials.
- Email delivery is not activated; onboarding messages will not be sent until the sender and provider are configured and verified.
- A secure first-admin activation is still required.
- The permanent domain now uses Neon, but the initial platform admin and full authenticated five-person acceptance have not been completed.
