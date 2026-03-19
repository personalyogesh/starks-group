import type { Fixture, FixtureStatus } from "@/lib/firebase/fixturesService";

export function fixtureDate(value: Fixture["date"] | unknown): Date | null {
  if (!value || typeof value !== "object" || !("toDate" in value)) return null;
  try {
    return (value as { toDate: () => Date }).toDate();
  } catch {
    return null;
  }
}

export function fixtureMatchup(fixture: Pick<Fixture, "opponent">): string {
  return `Starks vs ${fixture.opponent}`;
}

export function fixtureStatusLabel(status: FixtureStatus): string {
  switch (status) {
    case "live":
      return "Live";
    case "completed":
      return "Completed";
    case "postponed":
      return "Postponed";
    default:
      return "Upcoming";
  }
}

export function isFixtureUpcoming(fixture: Pick<Fixture, "date" | "status">) {
  const date = fixtureDate(fixture.date);
  if (fixture.status === "completed") return false;
  if (!date) return fixture.status === "live" || fixture.status === "postponed";
  return date.getTime() >= Date.now() || fixture.status === "live" || fixture.status === "postponed";
}
