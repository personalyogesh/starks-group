import type { Metadata } from "next";

import { PUBLIC_SITE } from "@/content/publicSite";

const defaultTitle = `${PUBLIC_SITE.clubName} | Triangle, NC`;
const defaultDescription =
  "Starks Cricket — community cricket in the Triangle since 2018. Fixtures, club news, sponsors and match-day memories.";

export const publicSiteMetadata: Metadata = {
  metadataBase: new URL(PUBLIC_SITE.siteUrl),
  title: {
    default: defaultTitle,
    template: `%s | ${PUBLIC_SITE.clubName}`,
  },
  description: defaultDescription,
  keywords: [
    "Starks Cricket",
    "cricket club",
    "North Carolina cricket",
    "Triangle cricket",
    "Morrisville",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: PUBLIC_SITE.siteUrl,
    siteName: PUBLIC_SITE.clubName,
    title: defaultTitle,
    description: defaultDescription,
    images: [
      {
        url: "/icon.jpg",
        width: 512,
        height: 512,
        alt: `${PUBLIC_SITE.clubName} logo`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: defaultTitle,
    description: defaultDescription,
    images: ["/icon.jpg"],
  },
  alternates: {
    canonical: PUBLIC_SITE.siteUrl,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export function pageMetadata(title: string, description: string): Metadata {
  return {
    title,
    description,
    openGraph: {
      title: `${title} | ${PUBLIC_SITE.clubName}`,
      description,
    },
  };
}
