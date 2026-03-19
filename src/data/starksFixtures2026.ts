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
  return Array.from({ length: 13 }).map((_, index) => {
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
