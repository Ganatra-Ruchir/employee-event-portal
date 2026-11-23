# Railway PostgreSQL — Employee Volunteer System V4 (staging)

**State:** Source code and migration prepared. Railway has NOT been provisioned by this branch. The current production system must remain on browser demo mode until a separate acceptance gate is passed.

## Architecture

- Frontend and API: existing Next.js 16 portal, Vercel preview or Railway app service
- Primary data store: Railway PostgreSQL 16+ (create an isolated **staging** environment)
- Auth/session: existing server-side scrypt password hashes, HTTP-only session cookies; first-account bootstrap and password rotation must be tested independently
- Multi-tenancy: organizations -> countries -> states -> branches -> employee memberships
- Product records: events -> registrations -> verified attendance / volunteer minutes -> feedback / certificates
- CSR: partner organizations -> campaigns -> outcome records -> independent verification
- Optional restrictions: event audiences -> country, state, branch or invited employee IDs
- Notifications: outbox schema only; no email/WhatsApp provider is connected

**Do not store real employee details or beneficiary PII until the complete security review.** The V4 impact table is aggregate-only by design.

## New tables in 091 migration

| Group | Tables |
| --- | --- |
| CSR | csr_partners, csr_campaigns, csr_campaign_events, csr_impact_records |
| Access | event_audiences, event_invitees |
| Volunteering | event_attendance, event_feedback, volunteer_certificates |
| Communication | notification_outbox |

These complement the existing organizations, organization_domains, users, sessions, events, registrations, audit_logs, v3_countries, v3_states, v3_branches, v3_memberships and v3_contributions tables.

The migration is additive; legacy tables/data are kept intact. No real beneficiary records are created or inserted.

## Provision Railway staging

1. Connect your Railway account to ChatGPT or visit https://railway.com and open your own workspace.
2. Create a separate project named **Elixir Volunteer Staging**, add a PostgreSQL service from Railway's Postgres template, and keep it private by default.
3. Enable automated backups (and PITR if needed) in the Railway database Backups tab. Use a staging-only set of credentials.
4. If hosting the Next.js API **inside the same Railway project**, use Railway's private \`DATABASE_URL\` variable reference. The \`*.railway.internal\` hostname never resolves outside Railway.
5. If keeping the frontend on **Vercel**, create a Railway **TCP Proxy** (service Settings -> Networking -> Public Access). Copy Railway's \`DATABASE_PUBLIC_URL\` into the Vercel *preview* environment secret called \`DATABASE_URL\`. This may have egress charges. Use TLS certificate validation, not \`rejectUnauthorized:false\`.
6. If TLS verification requires a trust chain, configure the appropriate trusted CA via \`DATABASE_CA_CERT\`. Do not copy certificate passwords or database URLs into GitHub or chat.
7. In a Vercel preview (not production), set:
   - \`PORTAL_BACKEND_MODE=database\`
   - \`PORTAL_V3_ENABLED=true\`
   - \`PORTAL_V4_ENABLED=true\`
   - \`NEXT_PUBLIC_PORTAL_DATABASE_ENABLED=true\`
   - \`NEXT_PUBLIC_PORTAL_V4_ENABLED=true\`
   - \`DATABASE_SSL_MODE=verify-full\` for external database connections
8. In Railway-internal staging, do not set \`DATABASE_SSL_MODE=verify-full\` unless you have valid internal certificates: the app auto-detects the private host and chooses the private network connection.
9. Run **manual migrations only against staging**. Set \`ALLOW_STAGING_MIGRATIONS=true\` for the migration command, then unset. Use a staging \`DATABASE_URL_UNPOOLED\`, \`DIRECT_URL\`, or \`DATABASE_PUBLIC_URL\` as appropriate:

   \`\`\`sh
   ALLOW_STAGING_MIGRATIONS=true npm run db:migrate
   \`\`\`

   The migration tool checks for production environment names and keeps SHA-256 checksums in \`schema_migrations\`; applied migration files must not be edited. Use a new numbered migration for later changes.

10. Bootstrap the first administrator using the existing protected flow, configure company domains, country, state and branch, then provision *fictional test* employees.
11. Run \`npm run typecheck && npm run lint && npm run test && npm run build\`. Test sign-in, first password rotation, 2 concurrent registrations for one last spot, role isolation, denied cross-state access, invitation-only visibility, cancellation, attendance, feedback and certificate issuance.
12. Review logs and backups and manually check desktop/mobile layouts and accessibility before approving the V4 migration. Do **not** put the new branch or staging data into production without approval.

## Implemented on this branch

- Versioned Railway-compatible V4 SQL schema
- Additive event audience policy used in employee event discovery and registration APIs
- CSR workspace at \`/impact\` in database preview (navigation visible when the V4 public preview flag is enabled)
- Scoped campaigns, aggregate impact recording and independent verification
- Attendance verification, employee feedback and certificate number generation via V4 APIs
- Migration ledger and network-appropriate database TLS behavior

## Still required before production

- Real Railway project/database creation and credential connection
- Confirmed migration execution and PostgreSQL integration tests
- Independent cross-company and cross-country API authorization review for **all legacy V2 routes**; V3 membership alone does not protect older company-admin actions
- Complete partner-onboarding UI, campaign-event linking UI, bulk roster / walk-in sync, check-in QR workflow, certificate PDF renderer and revocation
- Real email/WhatsApp sender, delivery worker and retry policy (current \`notification_outbox\` is only a schema)
- Production authentication/email ownership and account recovery compatible with Railway
- Beneficiary data protection design, metrics deduplication rules, reporting exports, security audit, staged cutover/rollback

**Critical:** An issued certificate number is NOT a PDF certificate. The impact reach KPI is a sum of verified aggregate records, not necessarily a unique-person count. The software should never claim those capabilities until implemented.

## References

Railway documentation: https://docs.railway.com/databases/postgresql and https://docs.railway.com/networking/tcp-proxy
