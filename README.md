# Employee Volunteer System

> **V4 development branch:** Railway PostgreSQL integration and CSR workflows are under review. This is NOT the production branch. Real employee data must not be imported until migration, permissions, authentication and browser acceptance checks pass.
>
> [Railway PostgreSQL V4 setup and readiness guide](docs/RAILWAY_POSTGRES_V4.md) · [CSR workspace source](src/app/impact/page.tsx) · [Migration 091](db/migrations/091_railway_csr_volunteering.sql)


Next.js event management for Elixir Foundation and its partner organizations, with distinct interfaces for **Platform Admin**, **Organization Admin**, and **Employee**.

## Environments

| Environment | Storage | Status |
| --- | --- | --- |
| [Production](https://emplatfors.vercel.app/) (\`main\`) | Legacy browser-local demo | No production database migration |
| \`feature/neon-postgres-backend\` on Vercel Preview | Neon PostgreSQL + private Neon Object Storage | Staging backend and health checks operational |

The legacy demo still supports fictional companies and demo credentials. **Never use real credentials or employee data in demo mode.** The database-enabled preview has its own administrator setup flow and is not seeded with fictional accounts.

## Staging PostgreSQL integration

- Server-only PostgreSQL queries, password hashes (scrypt), HTTP-only cookies and revocable sessions
- Organization isolation and privileged actions enforced in Next.js API handlers
- Organization and employee account management, approvals, role invitations, event management
- Atomic registrations, waitlisting, cancellations and promotion when places become available
- Private banner and speaker-image uploads to branch-isolated Neon Object Storage, delivered with short-lived signed URLs
- Non-production migrations: \`db/migrations/001_init.sql\` and \`002_admin_setup.sql\`
- Read-only health endpoints: \`/api/portal/health\` and \`/api/portal/media-health\`

**Database mode is activated only when \`PORTAL_BACKEND_MODE=database\` is configured for the preview Git branch.** Production remains in local-demo mode.

The staging first administrator is activated via a single-use link sent to the owner’s verified work inbox. The link does not contain a password; the recipient chooses their password on the protected staging website.

Read [Neon staging setup and operational checklist](docs/NEON_STAGING_SETUP.md) for branches, migrations, secrets and production readiness.

## Development

Node.js 22+:

\`\`\`sh
npm install
npm run dev
npm run typecheck
npm run lint
npm run test
npm run build
\`\`\`

For database testing, configure \`DATABASE_URL\` for the appropriate non-production Neon branch and set \`PORTAL_BACKEND_MODE=database\`. **Never commit database URLs or service credentials.**

## Current production readiness limits

- Work-email ownership verification and automated recovery emails are not implemented in the custom staging authentication flow. New accounts require manual administrator approval.
- Event email notifications and reminders are not yet connected to a transactional email provider.
- Independent cross-device RSVP and concurrent booking tests require activated accounts and staging acceptance testing.
- A separate audited production migration and public access review are required before real employee data is processed.

See [GitHub draft pull request](https://github.com/Ganatra-Ruchir/Corporate-Event-Management-Employee-Registration-Portal/pull/1) for the proposed database integration. Do not merge without approval and staged validation.


## V4 landing and reviewed company onboarding (staging)

- Redesigned public landing: responsive employee volunteering experience, accessible micro-animations and illustrated dashboard previews (figures are **illustrative**, not live analytics).
- Public company application: `/companies/register` → `POST /api/company-applications` creates a **pending** request, never a company account automatically.
- Platform Root Admin review: `/admin/company-requests` → authenticated `GET/PATCH /api/company-applications`. Approval creates an organization, country, work domain and pending invitation; rejection records a reason.
- Nominated contact: follows normal **work-email OTP signup**; approved organization + matching invitation is required before becoming Company/Country Admin. No automatic company notification sender is deployed.
- Staging-only migration: `db/migrations/092_company_applications.sql`; apply through the isolated Railway migration gate and turn it back off after verification.
- UX research, security notes and acceptance gates: [UI research and onboarding](docs/UI_RESEARCH_AND_ONBOARDING.md).
- Expanded CI browser audit: disposable PostgreSQL + authenticated Root, Country, State and employee sessions, cross-tenant registrations, owner-only certificates, mobile layouts and approved company requests.

**Safety:** No automatic production merge. Complete provider-based email delivery, manual organizational review and security checks before processing real applicants.
