/**
 * Every external or cross-site URL used by the site.
 *
 * `href: null` means the destination does not exist yet (TBD). The UI renders
 * those as disabled "coming soon" states instead of guessing a URL.
 * Set a value through the matching NEXT_PUBLIC_* env var or edit it here.
 */
export interface SiteLink {
  readonly label: string;
  readonly href: string | null;
  readonly description: string;
  readonly external: boolean;
}

const env = (value: string | undefined): string | null =>
  value && value.trim().length > 0 ? value.trim() : null;

export const links = {
  product: {
    label: "Product",
    href: env(process.env.NEXT_PUBLIC_SEAT_PRODUCT_URL),
    description: "The desk blotter: deposit, seats, fill tape.",
    external: true,
  },
  github: {
    label: "GitHub",
    href: "https://github.com/seat-hq/seat",
    description: "Contracts, keeper, SDK and docs. MIT licensed.",
    external: true,
  },
  x: {
    label: "X",
    href: env(process.env.NEXT_PUBLIC_SEAT_X_URL),
    description: "Announcements and release notes.",
    external: true,
  },
  community: {
    label: "Community",
    href: env(process.env.NEXT_PUBLIC_SEAT_COMMUNITY_URL),
    description: "Chat with builders, leaders and depositors.",
    external: true,
  },
  discussions: {
    label: "Technical discussions",
    href: "https://github.com/seat-hq/seat/issues",
    description: "Open issues and design questions in the repo.",
    external: true,
  },
  docs: {
    label: "Docs",
    href: "/docs",
    description: "Litepaper, risk, allowlist and phase runbooks.",
    external: false,
  },
  articles: {
    label: "Articles",
    href: "/articles",
    description: "Research and engineering notes.",
    external: false,
  },
} as const satisfies Record<string, SiteLink>;

export type LinkKey = keyof typeof links;

export const siteUrl =
  env(process.env.NEXT_PUBLIC_SEAT_SITE_URL) ?? "http://localhost:3100";
