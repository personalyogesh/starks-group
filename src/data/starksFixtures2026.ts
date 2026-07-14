export type FixtureSeasonKey = "mega-bash-2026" | "mega-smash-2026" | "playoffs-2026";

export type FixtureSeedTemplate = {
  id: string;
  seasonKey: FixtureSeasonKey;
  seasonLabel: string;
  seasonYear: number;
  gameNumber: number;
  opponent: string;
  venue: string;
  location: string;
  venueType: "home" | "away" | "neutral";
  notes?: string;
};

export type MegaSmashOfficialScheduleItem = {
  gameNumber: number;
  month: number;
  day: number;
  hour24: number;
  minute: number;
  opponent: string;
  venue: string;
  location: string;
  starksRole: "visitor" | "home";
};

export const DEFAULT_FIXTURE_YOUTUBE_URL = "https://www.youtube.com/@starkscricket";

export const FIXTURE_SEASON_OPTIONS: Array<{ key: FixtureSeasonKey; label: string }> = [
  { key: "mega-bash-2026", label: "Mega Bash 2026" },
  { key: "mega-smash-2026", label: "Mega Smash 2026" },
  { key: "playoffs-2026", label: "Playoffs 2026" },
];

function makeSeasonTemplates(args: {
  seasonKey: FixtureSeasonKey;
  seasonLabel: string;
  homeVenue: string;
  homeLocation: string;
  awayVenue: string;
  awayLocation: string;
  neutralVenue: string;
  neutralLocation: string;
  opponentPrefix: string;
}) {
  return Array.from({ length: 12 }).map((_, index) => {
    const gameNumber = index + 1;
    const venueType =
      gameNumber % 5 === 0 ? "neutral" : gameNumber % 2 === 0 ? "away" : "home";

    const venue =
      venueType === "home"
        ? args.homeVenue
        : venueType === "away"
          ? args.awayVenue
          : args.neutralVenue;

    const location =
      venueType === "home"
        ? args.homeLocation
        : venueType === "away"
          ? args.awayLocation
          : args.neutralLocation;

    return {
      id: `${args.seasonKey}-${String(gameNumber).padStart(2, "0")}`,
      seasonKey: args.seasonKey,
      seasonLabel: args.seasonLabel,
      seasonYear: 2026,
      gameNumber,
      opponent: `${args.opponentPrefix} ${String(gameNumber).padStart(2, "0")}`,
      venue,
      location,
      venueType,
      notes:
        gameNumber === 1
          ? "Template fixture. Add date, opponent details, live score link, result, and MVP before publishing."
          : undefined,
    } satisfies FixtureSeedTemplate;
  });
}

export const STARKS_2026_FIXTURE_TEMPLATES: FixtureSeedTemplate[] = [
  ...makeSeasonTemplates({
    seasonKey: "mega-bash-2026",
    seasonLabel: "Mega Bash 2026",
    homeVenue: "Starks Cricket Ground",
    homeLocation: "Triangle, NC",
    awayVenue: "Triangle Cricket Complex",
    awayLocation: "Raleigh, NC",
    neutralVenue: "Central Cricket Park",
    neutralLocation: "Morrisville, NC",
    opponentPrefix: "Mega Bash Opponent",
  }),
  ...makeSeasonTemplates({
    seasonKey: "mega-smash-2026",
    seasonLabel: "Mega Smash 2026",
    homeVenue: "Starks Cricket Ground",
    homeLocation: "Triangle, NC",
    awayVenue: "Cary Cricket Fields",
    awayLocation: "Cary, NC",
    neutralVenue: "Capital Turf Oval",
    neutralLocation: "Durham, NC",
    opponentPrefix: "Mega Smash Opponent",
  }),
];

export const MEGA_SMASH_2026_OFFICIAL_SCHEDULE: MegaSmashOfficialScheduleItem[] = [
  {
    gameNumber: 1,
    month: 8,
    day: 1,
    hour24: 11,
    minute: 0,
    opponent: "Limited Edition",
    venue: "RTPPark Field 1",
    location: "Division D6",
    starksRole: "visitor",
  },
  {
    gameNumber: 2,
    month: 8,
    day: 8,
    hour24: 18,
    minute: 0,
    opponent: "RockStars",
    venue: "RTPPark Field 4",
    location: "Division D6",
    starksRole: "visitor",
  },
  {
    gameNumber: 3,
    month: 8,
    day: 16,
    hour24: 16,
    minute: 0,
    opponent: "HS Hurricanes",
    venue: "RTPPark Field 3",
    location: "Division D6",
    starksRole: "visitor",
  },
  {
    gameNumber: 4,
    month: 7,
    day: 19,
    hour24: 14,
    minute: 0,
    opponent: "Astras",
    venue: "Bethesda Cricket Ground - Lower",
    location: "Division D6",
    starksRole: "home",
  },
  {
    gameNumber: 5,
    month: 8,
    day: 23,
    hour24: 10,
    minute: 45,
    opponent: "Dragons XI",
    venue: "Century Fields 3",
    location: "Division D6",
    starksRole: "home",
  },
  {
    gameNumber: 6,
    month: 8,
    day: 29,
    hour24: 10,
    minute: 30,
    opponent: "White Oak Warriors",
    venue: "Bethesda Cricket Ground - Lower",
    location: "Division D6",
    starksRole: "home",
  },
  {
    gameNumber: 7,
    month: 8,
    day: 30,
    hour24: 13,
    minute: 30,
    opponent: "Fuquay Mavericks",
    venue: "Bethesda Cricket Ground - Lower",
    location: "Division D6",
    starksRole: "home",
  },
  {
    gameNumber: 8,
    month: 9,
    day: 12,
    hour24: 13,
    minute: 0,
    opponent: "MIB",
    venue: "Bethesda Cricket Ground - Upper",
    location: "Division D6",
    starksRole: "home",
  },
  {
    gameNumber: 9,
    month: 9,
    day: 19,
    hour24: 16,
    minute: 0,
    opponent: "Cholas-HT",
    venue: "RTPPark Field 3",
    location: "Division D6",
    starksRole: "home",
  },
  {
    gameNumber: 10,
    month: 9,
    day: 26,
    hour24: 15,
    minute: 45,
    opponent: "Mammoths",
    venue: "C. R. Woods Park",
    location: "Division D6",
    starksRole: "home",
  },
  {
    gameNumber: 11,
    month: 10,
    day: 4,
    hour24: 12,
    minute: 45,
    opponent: "Apex Blues",
    venue: "River Forest Park Ground",
    location: "Division D6",
    starksRole: "home",
  },
  {
    gameNumber: 12,
    month: 10,
    day: 17,
    hour24: 15,
    minute: 0,
    opponent: "Himalayan Kings",
    venue: "RTPPark Field 4",
    location: "Division D6",
    starksRole: "home",
  },
];
