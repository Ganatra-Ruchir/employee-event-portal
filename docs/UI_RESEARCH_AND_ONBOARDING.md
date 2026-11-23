# Employee Volunteer System V4 — UI references and company onboarding

**Environment:** isolated Railway staging (Free plan); production main/ Vercel unchanged.

## Five product references (reviewed November 2026)

1. **Deed** — https://www.joindeed.com/ and https://support.joindeed.com/hc/en-us/articles/8635963003028--Admin-Platform
   - Pattern adapted: personalized employee discovery and clear distinction between employee and admin entry points.
2. **Goodera** — https://www.goodera.com/ and https://www.goodera.com/pages/corporate-volunteering
   - Pattern adapted: welcoming company volunteering narrative, clear partner and employee journeys.
3. **Benevity** — https://benevity.com/products/volunteer
   - Pattern adapted: employee engagement and SDG/impact measurement focus.
4. **Golden Volunteer** — https://goldenvolunteer.com/platform/
   - Pattern adapted: intuitive check-in/attendance and low-friction volunteer program management.
5. **GivePulse** — https://support.givepulse.com/hc/en-us/articles/360025594073-User-Dashboard-Overview and https://support.givepulse.com/hc/en-us/articles/206848887-Visual-Impact-Data-Insights-Word-Cloud-Heat-Map-and-Cause-Distribution
   - Pattern adapted: KPI-first volunteer dashboard and useful visual impact reporting.

The resulting design is original and does not copy vendor layouts or imagery. The landing page uses original graphics already in the repository; numbers in its sample preview are clearly marked **illustrative**.

## UI design system

- White/off-white backgrounds; Elixir-inspired green (#285E30), restrained pink (#ED3981) and charcoal text.
- One primary action per section; clear company, employee, and admin entrances.
- Card-based interface, subtle first-load and scroll-in animation, intersection-triggered chart growth.
- Always respect \`prefers-reduced-motion\`; disable motion if the user requests it.
- Company registration at \`/companies/register\`; root review at \`/admin/company-requests\`.
- Self-contained \`landing-next.css\`, \`onboarding.css\`; layouts designed for 390px mobile and desktop.
- No third-party image hotlinks introduced in the redesigned landing.

## Company onboarding — security model

1. **Public application:** \`POST /api/company-applications\` validates company name, exact work domain/email match, non-personal domains, location, website and team size. Only a \`company_applications\` row is created with \`pending\` status. Limits include body size, duplicate pending domain, per-email frequency, hidden honeypot. No organization or user is created.
2. **Root-only review:** \`GET/PATCH /api/company-applications\` requires an authenticated, verified Root Admin. Rejections require notes. Approval requires explicit ownership-review confirmation and notes.
3. **Approval transaction:** creates an organization, its approved email domain and country, plus a pending invitation for the nominated work email. Records reviewer and an audit log. This does **not** verify ownership of the mailbox by itself.
4. **Mailbox verification:** nominated applicant uses existing employee sign-up with OTP to prove exact work email ownership. The signup transaction recognizes only a matching **approved application plus pending invitation**, then assigns company admin and V3 country-admin membership and marks invitation consumed.
5. **No automatic email sending:** approval screen explicitly states that automatic email notification is not currently configured. An admin must direct the applicant to signup manually until a verified email worker is enabled.

**Production blockers**: email provider/OTP integration must be verified; company domain ownership review is currently manual; anti-abuse controls need stronger distributed rate limiting; automated end-to-end user-approval tests and security review must pass before merging.

## Migration & staging deployment

- Migration \`092_company_applications.sql\` adds the reviewed company-applications queue.
- Database changes are staging-only behind explicit Railway project authorization. Keep all sample data for tests until the user asks to clear it.
- Temporarily enable only the approved staging migration gate, apply migration, verify checksum ledger and endpoint, and disable the gate afterward.
- Do not deploy V4 to main/ Vercel production until authorized.

## QA acceptance checklist

- [ ] Public company request creates pending row, not an organization or account.
- [ ] Duplicate domain and personal mail domains are blocked.
- [ ] Employee or country admin cannot fetch applications or approve.
- [ ] Root confirms domain ownership before approving/rejecting.
- [ ] Approval creates one organization, one domain, one country, one invitation.
- [ ] Only exact invited verified contact becomes Country Admin.
- [ ] Cross-company event discoverability and RSVP enforced server-side.
- [ ] Certificate ownership and verified attendance enforced server-side.
- [ ] 390px mobile landing, application and Root queue have no horizontal overflow.
- [ ] New chart animations don't conceal data when reduced motion is preferred.
- [ ] All CI tests and Railway database health check pass.

