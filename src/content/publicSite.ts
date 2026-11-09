/**
 * Public site content (edit here — no CMS or Firebase required).
 * See src/content/README.md for maintainer instructions.
 */

import { MEGA_SMASH_2026_OFFICIAL_SCHEDULE } from "@/data/starksFixtures2026";

export const PUBLIC_SITE = {
  siteUrl: "https://starksgroup.org",
  clubName: "Starks Cricket",
  established: 2018,
  tagline: "More Than a Team. A Cricket Family.",
  heroIntro:
    "Celebrating cricket, teamwork, friendships and unforgettable moments on and off the field.",
  aboutBlurb:
    "Starks Cricket is a community cricket club established in 2018 in the Triangle, North Carolina. We welcome players, families and supporters who share a love for the game, fair competition and lasting friendships.",
  location: "Morrisville, NC",
  contactEmail: "starksgroup@starksgrp.org",
  contactPhone: "+1 909-999-0153",
  /**
   * External scoring / scheduling platform when live results are not listed on this site.
   */
  liveScoringUrl: undefined as string | undefined,
  social: {
    instagram: "https://www.instagram.com/starkscricketclub/",
    facebook: "https://www.facebook.com/share/1FEvmfc9FX/",
    youtube: "https://www.youtube.com/@starks4cricket",
    x: "https://x.com/clubstarks?s=21&t=BAMIGs5adc1xl19nJGtDEw",
  },
  myCricket360: {
    title: "My Cricket 360",
    status: "coming-soon" as const,
    blurb:
      "Player registration, team tools and consent-managed public content will move to My Cricket 360. This website will display only approved public updates from club admins.",
  },
} as const;

export type ClubAnnouncement = {
  id: string;
  date: string; // ISO date YYYY-MM-DD
  title: string;
  summary: string;
  href?: string;
};

/** Edit announcements here for the homepage and news strip. */
export const CLUB_ANNOUNCEMENTS: ClubAnnouncement[] = [
  {
    id: "welcome-v2",
    date: "2026-11-01",
    title: "Welcome to the Starks public site",
    summary:
      "Our refreshed website focuses on fixtures, club news, sponsors and match-day memories. Member tools are moving to My Cricket 360.",
  },
];

export type PublicMatchResult = {
  id: string;
  date: string; // ISO date
  opponent: string;
  venue: string;
  /** Do not publish unless verified. */
  resultSummary: string;
  seasonLabel?: string;
};

/** Add verified results only — leave empty if none are confirmed for publication. */
export const VERIFIED_MATCH_RESULTS: PublicMatchResult[] = [];

export type PublicFixture = {
  id: string;
  gameNumber: number;
  date: string; // ISO date
  timeLabel: string;
  opponent: string;
  venue: string;
  location: string;
  starksRole: "home" | "visitor";
  seasonLabel: string;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toIsoDate(year: number, month: number, day: number) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function formatTime12h(hour24: number, minute: number) {
  const am = hour24 < 12;
  const h = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const m = pad(minute);
  return `${h}:${m} ${am ? "AM" : "PM"}`;
}

/** Mega Smash 2026 schedule (verified from club admin data). No invented scores. */
export function getPublicMegaSmashFixtures(
  referenceDate = new Date(),
  opts?: { recentLimit?: number },
): {
  upcoming: PublicFixture[];
  recent: PublicFixture[];
  all: PublicFixture[];
} {
  const seasonYear = 2026;
  const fixtures: PublicFixture[] = MEGA_SMASH_2026_OFFICIAL_SCHEDULE.map((row) => {
    const date = toIsoDate(seasonYear, row.month, row.day);
    return {
      id: `mega-smash-2026-${row.gameNumber}`,
      gameNumber: row.gameNumber,
      date,
      timeLabel: formatTime12h(row.hour24, row.minute),
      opponent: row.opponent,
      venue: row.venue,
      location: row.location,
      starksRole: (row.starksRole === "home" ? "home" : "visitor") as "home" | "visitor",
      seasonLabel: "Mega Smash 2026",
    };
  }).sort((a, b) => a.date.localeCompare(b.date) || a.gameNumber - b.gameNumber);

  const refIso = referenceDate.toISOString().slice(0, 10);
  const upcoming = fixtures.filter((f) => f.date >= refIso);
  const past = fixtures.filter((f) => f.date < refIso);
  const limit = opts?.recentLimit ?? 4;
  const recent = past.slice(-limit).reverse();

  return { upcoming, recent, all: fixtures };
}

export const SPONSOR_HASHTAG_INDIA = {
  name: "Hashtag India",
  location: "Cary, NC",
  tagline: "Indian Authentic Food",
  description:
    "Hashtag India proudly supports Starks Cricket. Experience authentic Indian cuisine in the heart of Cary, NC.",
  exclusivityBlurb:
    "Hashtag India Cary is our featured restaurant partner on starksgroup.org. We do not list additional food sponsors here unless verified by club leadership.",
  logoSrc: "/partners/hashtag-india-optimized.png",
  instagramUrl: "https://www.instagram.com/hashtagindia_cary_nc?igsh=MWI1em95NTFkMzVkbg==",
  instagramHandle: "@hashtagindia_cary_nc",
  partnershipCtaEmail: "starksgroup@starksgrp.org",
} as const;

export const SPONSORSHIP_SUPPORT = {
  headline: "Support Starks Cricket",
  body: "Community sponsorship helps cover cricket-related expenses—equipment, grounds, match-day operations and club events—so players and families can focus on the game.",
  exclusivityNote:
    "Hashtag India Cary remains our featured partner on this site. Other partnerships are published only when verified.",
  ecosystemNote:
    "Starks Cricket, CGI Steelers Cricket and My Cricket 360 share a low-cost digital ecosystem for club promotion and player engagement. Player registration, private profiles, kit sizes, birthdays and photo consent stay in My Cricket 360—not on this public site.",
  inquirySubject: "Sponsorship inquiry — Starks Cricket",
  inquiryCtaLabel: "Sponsorship inquiry",
} as const;

export type VerifiedClubHighlight = {
  id: string;
  title: string;
  detail: string;
};

/** Verifiable facts only—no invented trophies, reach or dollar amounts. */
export const VERIFIED_CLUB_HIGHLIGHTS: VerifiedClubHighlight[] = [
  {
    id: "established-2018",
    title: `Club since ${PUBLIC_SITE.established}`,
    detail: "Community cricket based in the Triangle, North Carolina.",
  },
  {
    id: "mega-smash-2026",
    title: "Mega Smash 2026",
    detail: "Twelve-match Division D6 schedule published for the 2026 Mega Smash season.",
  },
  {
    id: "featured-partner",
    title: "Hashtag India Cary",
    detail: "Featured sponsor supporting Starks Cricket—Indian authentic food in Cary, NC.",
  },
];

export type SocialHighlightPlatform = "instagram" | "youtube" | "facebook" | "x";

export type SocialHighlight = {
  id: string;
  platform: SocialHighlightPlatform;
  title: string;
  description?: string;
  href: string;
  /** True for profile/channel links; false for a specific post or video URL. */
  isChannelLink?: boolean;
};

const BASE_SOCIAL_HIGHLIGHTS: SocialHighlight[] = [
  {
    id: "highlight-instagram",
    platform: "instagram",
    title: "Starks Cricket on Instagram",
    description: "Primary home for match photos, reels and celebrations.",
    href: PUBLIC_SITE.social.instagram,
    isChannelLink: true,
  },
  {
    id: "highlight-facebook",
    platform: "facebook",
    title: "Starks Cricket on Facebook",
    description: "Club updates, events and community celebrations.",
    href: PUBLIC_SITE.social.facebook,
    isChannelLink: true,
  },
  {
    id: "highlight-youtube",
    platform: "youtube",
    title: "Match highlights on YouTube",
    description: "Recaps and video from the pitch—open the channel for the latest uploads.",
    href: PUBLIC_SITE.social.youtube,
    isChannelLink: true,
  },
  /**
   * Add specific verified post/video links below (isChannelLink: false).
   * Example:
   * { id: "highlight-yt-2026-04", platform: "youtube", title: "…", href: "https://www.youtube.com/watch?v=…", isChannelLink: false },
   */
];

/** Curated outbound links only—edit here; no APIs or media mirroring. */
export const SOCIAL_HIGHLIGHTS = BASE_SOCIAL_HIGHLIGHTS;

export const PUBLIC_NAV = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/matches", label: "Matches" },
  { href: "/gallery", label: "Gallery" },
  { href: "/sponsors", label: "Sponsors" },
  { href: "/contact", label: "Contact" },
] as const;
