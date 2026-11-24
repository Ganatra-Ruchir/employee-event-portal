# Employee Volunteer System

Next.js event management for Elixir Foundation and its partner organizations, with distinct interfaces for **Platform Admin**, **Organization Admin**, and **Employee**.

## Environments

| Environment | Storage | Status |
| --- | --- | --- |
| [Production](https://employee-event-portal.vercel.app/) (`main`) | Neon PostgreSQL shared demo database | Database health returns HTTP 200 (`postgresql / ready`); root onboarding and acceptance testing pending |
| [V4 UI preview](https://employee-volunteer-v4.vercel.app/) | Separate Railway staging service | Different feature branch; not production |
| [Legacy app](https://emplatfors.vercel.app/) | Old demo project | Not used for client acceptance |

Production now uses **server-side PostgreSQL**, HTTP-only sessions and scoped country/state memberships. Its three organizations, employees, events, and attendance are fictional test records; do not add actual employee information until privacy and security approval.

The original browser-local accounts (and their passwords) are not automatically imported into Neon. The **eight dedicated shared-demo role accounts** use unique temporary passwords distributed privately outside this repository, with mandatory first-login rotation. Other fictional directory records have no usable password until an administrator provisions one.

[Shared Neon activation and five-client test guide](docs/NEON_SHARED_DEMO_ACTIVATION.md) · [UX blueprint](docs/ROLE_BY_ROLE_UX_BLUEPRINT.md)

### Backend and administrator setup

- `DATABASE_URL`, `PORTAL_BACKEND_MODE=database`, `PORTAL_V3_ENABLED=true`, and `NEXT_PUBLIC_PORTAL_DATABASE_ENABLED=true` are configured in the production Vercel project.
- The live `/api/portal/health` endpoint returned HTTP 200 with `{"mode":"postgresql","ready":true}` on 24 November 2026.
- The first platform administrator still requires a private, one-time activation using `scripts/issue-first-admin-link.mjs` and the existing `/admin/activate` route. Never place connection strings or activation links in the repository.
- A verified transactional-email sender is still needed for manager invitation emails. Without it, the email-dependent invitation flow is not ready.
- Client testing must verify independently logged-in sessions, organization isolation, and persisted attendance.
- The separately maintained Railway V4 preview may not include the latest `main` changes.

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

## Current client readiness limits

- Root-admin activation, separate-browser authenticated acceptance tests, and production latency measurements remain open.
- Email-provider verification and recovery/email notification flows remain open.
- All demo data is fictional. Consent and privacy reviews are needed before actual employee information is used.
- CI runs [PostgreSQL schema/API tests](.github/workflows/backend-schema.yml) and [browser/layout checks](.github/workflows/ci.yml). These do not replace real-client acceptance.
