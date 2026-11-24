# Employee Volunteer System — Five-Person Client Acceptance Plan
**Environment:** https://employee-event-portal.vercel.app  
**Updated:** 24 November 2026  
**Purpose:** Check UI, page connections, business functionality, visual consistency, performance, security boundaries and handover readiness.

> **Release limitation:** Production currently has no connected persistent database or transactional email service. Its browser demo is for fictional users only. The Railway V4 preview and Neon PostgreSQL test branch are separate environments. Do not load real employees, disclose actual passwords, or describe manager emails/live attendance as working until activation and real-account tests are complete.

## Five reviewers, separate scopes
| Tester | Account perspective | Primary checks |
|---|---|---|
| 1 | Public visitor / prospective company | Landing page, navigation, /apply form styling, inline validation, mobile layouts, sign-in/sign-up links |
| 2 | Root platform admin | Companies, company requests, create/edit partner, manager invitation, role boundaries, applications approval |
| 3 | Company / country admin | Countries, states, branches, employees, events, registration roster, attendance, reporting |
| 4 | State admin | Scoped employees, event attendance, present/absent checkboxes, extra participant search, no cross-state data |
| 5 | Employee | Sign-in, dashboard KPI and charts, event discovery, registration, event details, attendance history, profile and mobile |

## Test each page
Record **pass / fail / not available**, browser, device size, video/screenshot, timestamp and steps.
- Navigation: every visible internal button/link opens the intended page without a blank screen, redirect loop or inaccessible menu; browser back/reload returns to the intended view.
- Appearance: consistent spacing, headings, font hierarchy, colors, hover/focus/disabled states; no text clipping, icon overlaps or unexpected horizontal scroll.
- Responsive: 390 px mobile, 768 px tablet, 1440 px laptop and 2300 px desktop; test keyboard-only interactions.
- Accessibility: visible keyboard focus, labeled inputs/checkboxes, semantic headings, contrast (WCAG AA: 4.5:1 normal text; 3:1 large text and non-text components), reduced-motion behavior.
- Forms: required-field validation, invalid domain/email/phone, duplicate submissions, disabled buttons during save, actionable success/error messages, and no data loss on reload.
- Functionality: user roles cannot access another company's/state's records; registration is not counted as attendance; unchecked = absent after submission; extra attendee search excludes confirmed registrations and duplicate walk-ins.
- Latency: capture navigation load time, click-to-result, list search response and server requests at p50/p95; evaluate on a normal connection and on network throttling. Set release budgets with the client rather than treating localhost CI as real-user speed.
- Stability: no blank components, uncaught JS errors, broken images, 404/500 pages or endless spinners.
- Privacy/security: no credentials in URLs, public pages do not expose employee data, temporary passwords expire, login requires first-use rotation, unauthorized POSTs are rejected.
- Data: validate saved records in a separate session/device. Browser localStorage is NOT proof of cross-device persistence.

## Critical journeys
1. **New company:** landing → apply → pending application → root review → approved company → manager invited → login with temporary password → rotate password.
2. **Organization hierarchy:** root → company → country manager → state/branch → employee provisioning → employee login.
3. **Event:** manager creates and publishes → employee discovers → registers → event begins → manager opens roster → selects present employees → submits → searches existing employee without registration → adds extra → reopens and confirms saved values.
4. **Denied access:** employee must not see root tools; state admin must not change another state; companies must not see each other's employees, application records or attendance.
5. **Mobile:** repeat at 390 px with keyboard open, slow 3G and reduced motion; all primary forms/buttons must remain usable.

## Release gates
| Gate | Required before five-person real-account acceptance |
|---|---|
| Browser CI | Typecheck, lint, tests, build, role/route click-through and screenshots all pass on latest commit |
| PostgreSQL CI | Entire migration chain, HTTP endpoint smoke tests, attendance and application persistence pass |
| Production database | A specific audited backend chosen, backup/restore rehearsed, migrations applied with change record |
| Email | Verified sender domain/provider, delivery logs, invalid-address behavior, expiry and resend recovery tested |
| Company onboarding | Real application → root approval → secure invitation → password rotation end-to-end verified |
| Performance | Real deployment p50/p95 measurements captured, agreed latency budgets met |
| Security | Tenant/state isolation, CSRF, rate limiting, account lockout, upload controls and privacy reviewed |
| Sign-off | All P0/P1 issues closed, five testers sign acceptance; no demo credentials used with real data |

### Issue template
**Issue ID:** EVS-___ | **Tester:** ___ | **Severity:** P0 / P1 / P2 / P3  
**Role/page:** ___ | **Browser/device:** ___ | **Expected:** ___ | **Actual:** ___  
**Reproduction steps:** ___ | **Screenshot/video:** ___ | **Observed request/latency:** ___ | **Status/owner:** ___

**Severity:** P0 = security, data loss, wrong tenant, blocked critical flow; P1 = broken core task or unusable responsive view; P2 = visual, usability or slow behavior with workaround; P3 = minor polish.

## Current known blockers
- Main production environment has no configured PostgreSQL connection; attendance/application changes in demo mode are not multi-device persistence.
- No Resend sender/API credentials are configured on production, so manager credentials are not automatically emailed there.
- Railway V4 staging branch is not the same as current main production branch; do not merge it without feature parity, migrations and auth checks.
- Browser CI measures local demo navigation, not actual real-user production latency. Real-device/connection performance verification is still required.

## Fictional demo accounts (for isolated UI review only)
The built-in demo uses a shared **demo password** `Demo@2026!`, but each tester's browser stores its own separate local state. Do not treat a change made in one browser as visible in another. Never use real employee emails or data in this mode.

| Perspective | Demo email |
|---|---|
| Root | `admin@elixir.example` |
| Country/company | `country@micron.example` |
| State | `state@microsoft.example` |
| Employee | `employee@elixir.example` |
| Public | No login required |

For acceptance of cross-device persistence, manager emails and real company applications, switch to an approved staging environment with a transactional email provider and seeded test accounts. These cannot be signed off from local-demo mode.
