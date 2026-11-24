# Employee Volunteer System — Role-by-Role UX Blueprint
**Design objective:** compact, polished, KPI-first enterprise interface. Show the user's daily information first and move creation/edit/security forms behind explicit actions. No dead controls, misleading attendance metrics, or browser-only assumptions.

## Shared visual system
- Green / pink / charcoal brand accents, warm neutral surfaces; consistent button and card sizing
- One page heading plus its most important primary action in the right corner
- 4 compact KPIs maximum on a row; charts below; searchable list at the bottom
- Create and edit workflows open after button clicks, not on initial page render
- Long names and work emails wrap within their cards; mobile 390px, tablet 768px and wide desktop must not scroll horizontally
- "Registered" must never be labeled "Attended"; attendance requires verified event marks
- Limit lists to five visible rows when long, with a deliberate expand control

## Platform / Root Admin
| Page | Default overview | Deliberate actions |
|---|---|---|
| Overview | Organizations, employee reach, upcoming events, participation and trend charts | View organization |
| Organizations | Company status, approved domains, pending applications | Add organization, review application |
| Global hierarchy | State/country summary and assigned managers | Add country, assign company/country administrator |
| Accounts | Account health and searchable scoped directory | Approve, suspend, reset through account details |
| Events | All partner events with KPI summary | Inspect events (no platform editing by default) |

## Company / Country Admin
| Page | Default overview | Deliberate actions |
|---|---|---|
| Dashboard | Team engagement, upcoming events and actionable KPI cards | Open events |
| Hierarchy | **Existing locations first**: total states, branches, employees, monthly events; each state card shows headcount, branches and event count | Top-right **Add state**, then Add branch / Assign state administrator |
| People | Total/active employees, per-state bar chart, monthly registrations vs not registered donut; searchable staff directory | Top-right **Add employee**, then edit/suspend/reactivate/reset in a selected person |
| Events | Upcoming/completed/total events and confirmed registrations | Top-right **Create event**; no Add Speaker field |
| Attendance | Select event, registered roster, checked present/unchecked absent, submit, then add company walk-ins | Change attendance and add eligible walk-ins |

## State Admin
| Page | Default overview | Deliberate actions |
|---|---|---|
| Dashboard | State employee count, upcoming events and pending attendance | Open event |
| People | Assigned state only: active/total employees, **branch distribution**, monthly registered vs not-registered donut | Add employee in state, branch optional, edit/suspend/reset only assigned employees |
| Events | Company events available to this state; no company-wide administration controls | Open event |
| Attendance | Registered roster scoped to state, then additional existing employees by search | Submit and add walk-ins |
| Profile | Read-only personal details | Edit profile and Security |

## Employee
| Page | Default overview | Deliberate actions |
|---|---|---|
| My impact | Verified attendance, contribution hours, monthly trend, upcoming registrations | View event |
| Events | Search and filter available published events | Register |
| My events | Upcoming / past / cancelled registration history | View/cancel where permitted |
| Profile | Photo, name, email, role, department and work contact as read-only details | **Edit profile**, **Security**, photo only while editing |

## UX changes implemented in this revision
- Speaker creation control removed from event form; historical speaker content is retained
- Read-only profile with separate Edit profile / Security buttons and overflow fixes
- Demo hierarchy shows KPI cards and state cards **before** an Add State form
- Database hierarchy shows state cards, employee/month counts and on-demand state/branch/admin creation
- Country and State People pages show scoped KPIs and charts; Add Employee opens form on click
- Event management shows KPI cards above searchable event list
- No always-visible temporary-password-reset buttons in the demo location directory
- New browser tests assert hidden forms, correct navigation, no profile text overflow, and speaker-free event creation

## Conditions still required for real-client release
- Main Vercel environment must have a configured, migrated and tested shared PostgreSQL backend
- Manager email delivery needs a verified transactional provider
- Cross-browser provisioning, security boundary tests, and production response times must pass
- Five real reviewers must sign off only after verified production deployment
