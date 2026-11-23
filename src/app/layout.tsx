import type { Metadata } from "next";
/* All portal chrome belongs to the shared layout, not page.tsx.
   Nested routes like /overview need the same CSS bundle as /. */
import "./globals.css";
import "./portal.css";
import "./discovery.css";
import "./event-notifications.css";
import "./employee-profiles.css";
import "./event-quick-actions.css";
import "./speaker-motion.css";
import "./admin-auth.css";
import "./compact-layout.css";
import "./landing.css";
import "./theme.css";
import "./obsidian.css";
import "./elixir-brand.css";
import "./workspace-light.css";
import "./qa-fixes.css";
import "./ux-fixes.css";
import "./impact-workspace.css";
import "./layout-density.css";
import "./landing-next.css";
import "./evs-unified.css";
import "./evs-pages.css";
import "./evs-app-shell.css";

export const metadata:Metadata={
  title:"Employee Volunteer System",
  description:"Secure organization events, team experiences and employee registration."
};
export default function RootLayout({children}:{children:React.ReactNode}){
 return <html lang="en"><body>{children}</body></html>;
}
