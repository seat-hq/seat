import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "SEAT — Paper Desks (Phase 0)",
  description:
    "Read-only paper-mode view of SEAT copy desks. Not affiliated with Robinhood. Not investment advice.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
