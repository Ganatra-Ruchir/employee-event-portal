# Employee Volunteer System | 100-point release audit

This is a client acceptance checklist, **not a claim that 100 bugs have been found or fixed**. Confirm each item against the exact commit deployed to the permanent URL. Automated CI is not equivalent to production sign-off.

| ID | Area | Acceptance criterion | Evidence needed |
|---:|---|---|---|
| 001 | Authentication | Valid credential login | DB/API + role test |
| 002 | Authentication | Wrong-password denial | DB/API + role test |
| 003 | Authentication | Temporary credential expiry | DB/API + role test |
| 004 | Authentication | First-login rotation | DB/API + role test |
| 005 | Authentication | Current-password check | DB/API + role test |
| 006 | Authentication | Session revocation on password change | DB/API + role test |
| 007 | Authentication | Suspended-user session blocked | DB/API + role test |
| 008 | Authentication | Suspended-company login blocked | DB/API + role test |
| 009 | Authentication | Logout persistence | DB/API + role test |
| 010 | Authentication | Cross-browser authenticated login | DB/API + role test |
| 011 | Organizations | Root-only organization creation | DB/API + role test |
| 012 | Organizations | Company application approval | DB/API + role test |
| 013 | Organizations | Duplicate pending application prevention | DB/API + role test |
| 014 | Organizations | Domain ownership uniqueness | DB/API + role test |
| 015 | Organizations | Domain removal safe for existing accounts | DB/API + role test |
| 016 | Organizations | Country assignment before manager access | DB/API + role test |
| 017 | Organizations | Country admin cannot see foreign staff | DB/API + role test |
| 018 | Organizations | Country admin cannot see foreign events | DB/API + role test |
| 019 | Organizations | Country admin cannot edit foreign events | DB/API + role test |
| 020 | Organizations | Root visibility without company membership | DB/API + role test |
| 021 | Hierarchy | Country-scoped state creation | DB/API + role test |
| 022 | Hierarchy | No state-admin self-promotion | DB/API + role test |
| 023 | Hierarchy | State without branches supported | DB/API + role test |
| 024 | Hierarchy | Branchless employee creation | DB/API + role test |
| 025 | Hierarchy | Branch belongs to selected state | DB/API + role test |
| 026 | Hierarchy | Bihar manager assigned correctly | DB/API + role test |
| 027 | Hierarchy | Bihar cannot edit Gujarat | DB/API + role test |
| 028 | Hierarchy | Cannot provision into foreign organization | DB/API + role test |
| 029 | Hierarchy | State employee directory scoped | DB/API + role test |
| 030 | Hierarchy | Country KPI state grouping | DB/API + role test |
| 031 | Employees | Approved-domain email required | DB/API + role test |
| 032 | Employees | Duplicate email blocked | DB/API + role test |
| 033 | Employees | Hash temporary passwords | DB/API + role test |
| 034 | Employees | Temporary expiry enforced | DB/API + role test |
| 035 | Employees | Employee editing state-scoped | DB/API + role test |
| 036 | Employees | Employee suspension revokes sessions | DB/API + role test |
| 037 | Employees | Email change revokes sessions | DB/API + role test |
| 038 | Employees | Password reset revokes sessions | DB/API + role test |
| 039 | Employees | Employee cannot elevate roles | DB/API + role test |
| 040 | Employees | Legacy role bypass blocked | DB/API + role test |
| 041 | Events | Country admin creates event | DB/API + role test |
| 042 | Events | State admin creates own event | DB/API + role test |
| 043 | Events | Regular employee cannot create | DB/API + role test |
| 044 | Events | Root cannot create on behalf silently | DB/API + role test |
| 045 | Events | Country and state ownership persisted | DB/API + role test |
| 046 | Events | State ownership immutable | DB/API + role test |
| 047 | Events | State editor scope enforced | DB/API + role test |
| 048 | Events | Other-state event edits rejected | DB/API + role test |
| 049 | Events | State cancel permission enforced | DB/API + role test |
| 050 | Events | Speaker adding removed | DB/API + role test |
| 051 | Registration | Published eligible event discovery | DB/API + role test |
| 052 | Registration | Unauthorized drafts hidden | DB/API + role test |
| 053 | Registration | Foreign-state RSVP denied | DB/API + role test |
| 054 | Registration | Company-wide RSVP allowed | DB/API + role test |
| 055 | Registration | Deadline enforced | DB/API + role test |
| 056 | Registration | Start time enforced | DB/API + role test |
| 057 | Registration | Capacity concurrent safe | DB/API + role test |
| 058 | Registration | Waitlist respects setting | DB/API + role test |
| 059 | Registration | Waitlist promotion FIFO | DB/API + role test |
| 060 | Registration | Repeat RSVP idempotent | DB/API + role test |
| 061 | Attendance | Scoped event list | DB/API + role test |
| 062 | Attendance | Confirmed roster only | DB/API + role test |
| 063 | Attendance | Attendance checkbox aligned | DB/API + role test |
| 064 | Attendance | Checked and unchecked meanings | DB/API + role test |
| 065 | Attendance | Complete roster submission | DB/API + role test |
| 066 | Attendance | Future attendance locked | DB/API + role test |
| 067 | Attendance | Foreign company denied | DB/API + role test |
| 068 | Attendance | Foreign state denied | DB/API + role test |
| 069 | Attendance | Only existing walk-in employees | DB/API + role test |
| 070 | Attendance | Duplicate walk-ins blocked | DB/API + role test |
| 071 | Impact | Registration not attendance | Browser + manual review |
| 072 | Impact | Absent removes contribution | Browser + manual review |
| 073 | Impact | Unmarked cannot earn hours | Browser + manual review |
| 074 | Impact | Absent cannot earn hours | Browser + manual review |
| 075 | Impact | Present can verify hours | Browser + manual review |
| 076 | Impact | Minutes validated and bounded | Browser + manual review |
| 077 | Impact | Employee impact verified only | Browser + manual review |
| 078 | Impact | No duplicated hour credit | Browser + manual review |
| 079 | Impact | Repeat attendance idempotent | Browser + manual review |
| 080 | Impact | Correct chart metric labels | Browser + manual review |
| 081 | Visual and UX | Read-only Profile first | Browser + manual review |
| 082 | Visual and UX | Edit only on click | Browser + manual review |
| 083 | Visual and UX | Separate Security panel | Browser + manual review |
| 084 | Visual and UX | Long name and email wrapping | Browser + manual review |
| 085 | Visual and UX | Hierarchy KPIs above forms | Browser + manual review |
| 086 | Visual and UX | Add State opens on demand | Browser + manual review |
| 087 | Visual and UX | People charts before actions | Browser + manual review |
| 088 | Visual and UX | Add Employee opens on demand | Browser + manual review |
| 089 | Visual and UX | No speaker control desktop/mobile | Browser + manual review |
| 090 | Visual and UX | Responsive keyboard and focus behavior | Browser + manual review |
| 091 | Release | Production commit matches reviewed main | Production acceptance |
| 092 | Release | PostgreSQL health endpoint ready | Production acceptance |
| 093 | Release | Migrations valid | Production acceptance |
| 094 | Release | First Root Admin activated privately | Production acceptance |
| 095 | Release | Demo credential rotation | Production acceptance |
| 096 | Release | Two-browser persisted writes | Production acceptance |
| 097 | Release | Onboarding email provider verified | Production acceptance |
| 098 | Release | Five independent client role tests | Production acceptance |
| 099 | Release | CI backend and browser suites pass | Production acceptance |
| 100 | Release | Measured live production latency | Production acceptance |

## Rules for a PASS

An item needs an observable successful result, not merely a code change. Negative cases must return the expected HTTP denial and leave database state unchanged. For every privilege check, test the same-state, other-state, other-country, and other-organization variations where applicable.

## Known current blockers

- GitHub `main` has changes not yet confirmed on the permanent production URL; the Vercel project previously returned a daily deployment quota error.
- A full five-person, independently signed-in production acceptance run has not been completed.
- Transactional manager email delivery depends on a configured sender and provider.
- The final CI run must be green for the same commit being reviewed.
- Do not use real employee data in the fictional demo environment until privacy/security review.
