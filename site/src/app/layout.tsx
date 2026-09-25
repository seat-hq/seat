import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Fraunces, Inter_Tight, JetBrains_Mono, Montserrat } from "next/font/google";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { MotionBoot, motionHeadScript } from "@/motion/MotionBoot";
import { siteUrl, links } from "@/lib/links";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  axes: ["opsz", "SOFT"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
  display: "swap",
});

const inter = Inter_Tight({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono-face", display: "swap" });

const brand = Montserrat({ subsets: ["latin"], weight: ["600"], variable: "--font-montserrat", display: "swap" });

const description =
  "SEAT is a copy desk, not a sniper bot. Deposit USDG into a separate desk vault, receive seat shares that claim the desk's NAV, and let a risk engine decide which of a leader's Stock Token trades get copied — smaller, filtered and capped.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "SEAT — Copy desk, not sniper bot",
    template: "%s · SEAT",
  },
  description,
  keywords: [
    "copy trading",
    "wallet copy trading",
    "stock token trading",
    "risk-managed copy trading",
    "vault-based trading",
    "trading desk",
    "NAV",
    "seat shares",
    "Robinhood Chain",
    "USDG",
  ],
  openGraph: {
    type: "website",
    siteName: "SEAT",
    title: "SEAT — Copy desk, not sniper bot",
    description,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "SEAT — Copy desk, not sniper bot",
    description,
  },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = {
  themeColor: "#07140e",
  colorScheme: "dark",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "SEAT",
  url: siteUrl,
  description,
  logo: `${siteUrl}/brand/seat-mark-light.svg`,
  sameAs: [links.github.href, links.x.href, links.community.href].filter(Boolean),
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${inter.variable} ${mono.variable} ${brand.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: motionHeadScript }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </head>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <Nav />
        <div id="main">
          <main>{children}</main>
          <Footer />
        </div>
        <MotionBoot />
      </body>
    </html>
  );
}
