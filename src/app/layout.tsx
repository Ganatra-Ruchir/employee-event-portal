import type { Metadata } from "next";
import "./globals.css";
import "./theme.css";
import "./obsidian.css";
import "./elixir-brand.css";
import "./landing-public-theme.css";
import "./premium-2026.css";
export const metadata:Metadata={
  title:"Employee Volunteer System",
  description:"Secure organization events, team experiences and employee registration."
};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}