# V3 offline preview

The main portal uses browser storage by default and does not contact the PostgreSQL portal API at startup. No database credentials are needed. Run npm install and npm run dev.

Open sign-in and use any demo account with password Demo@2026!:
- Root: admin@elixir.example
- Country admin: alex@northwind.example
- State admin: state@northwind.example
- Employee: priya@northwind.example

Root can create companies through Companies, then add countries and provision country administrators from Overview. Country admin can create states, branches and accounts. State admin provisions employees in their assigned state. New employees log in via generated ID or email, rotate the temporary password and see verified contributions and upcoming company events. Changes persist in this browser; reset sample data from the preview banner.

This is a browser-only functional prototype, not a security boundary. Use mock data only, not personal data or actual credentials. Existing event visibility and legacy admin operations are company-based and still need hierarchy enforcement before production. The complete CSR/AI roadmap remains in V3-CSR-IMPLEMENTATION.md. Database mode is opt-in only via NEXT_PUBLIC_PORTAL_DATABASE_ENABLED=true at build time; do not enable it before migrations, access-control integration and production QA. Existing backend files are retained for later connection.

Run npm run typecheck and npm test, then verify all four demo accounts and the password-rotation flow in a browser.
