"use client";

import { CalendarDays, Clock3, MapPin, PlayCircle, Radio, Star, Trophy } from "lucide-react";

import { Badge } from "@/app/components/ui/badge";
import type { Fixture } from "@/lib/firebase/fixturesService";
import { fixtureDate, fixtureMatchup } from "@/lib/fixtures";
import Button from "@/components/ui/Button";

const statusStyles: Record<Fixture["status"], string> = {
  scheduled: "bg-white/15 text-white ring-1 ring-white/20",
  live: "bg-rose-500 text-white",
  completed: "bg-emerald-400 text-emerald-950",
  postponed: "bg-amber-300 text-amber-950",
};

const themeClasses = [
  "from-emerald-950 via-green-800 to-lime-700",
  "from-emerald-950 via-teal-800 to-green-700",
  "from-green-950 via-emerald-800 to-yellow-700",
  "from-slate-950 via-emerald-900 to-green-700",
  "from-green-900 via-lime-700 to-amber-600",
  "from-emerald-950 via-green-800 to-cyan-700",
  "from-teal-950 via-emerald-800 to-lime-700",
  "from-green-950 via-emerald-700 to-orange-700",
  "from-emerald-900 via-green-700 to-yellow-600",
  "from-slate-900 via-green-800 to-emerald-600",
  "from-emerald-950 via-teal-700 to-lime-600",
  "from-green-950 via-lime-800 to-amber-700",
  "from-emerald-900 via-teal-700 to-cyan-600",
];

function themeClassForGame(gameNumber: number) {
  return themeClasses[(Math.max(1, gameNumber) - 1) % themeClasses.length];
}

function formatStatus(status: Fixture["status"]) {
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

export default function FixtureCard({
  fixture,
  variant = "default",
  onViewDetails,
}: {
  fixture: Fixture;
  variant?: "default" | "featured";
  onViewDetails?: (fixture: Fixture) => void;
}) {
  const isFeatured = variant === "featured";
  const date = fixtureDate(fixture.date);
  const dateLabel = date
    ? date.toLocaleDateString(undefined, {
        weekday: isFeatured ? "long" : "short",
        month: "short",
        day: "numeric",
      })
    : "Date TBD";
  const timeLabel = date
    ? date.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      })
    : "Time TBD";

  return (
    <article
      className={[
        "overflow-hidden rounded-[28px] border border-emerald-950/10 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(15,23,42,0.12)]",
        isFeatured ? "xl:grid xl:grid-cols-[1.05fr,0.95fr]" : "",
      ].join(" ")}
    >
      <div className={`relative overflow-hidden bg-gradient-to-br ${themeClassForGame(fixture.gameNumber)} text-white`}>
        {fixture.heroImageUrl ? (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-35"
            style={{ backgroundImage: `url("${fixture.heroImageUrl}")` }}
          />
        ) : null}
        <div className="absolute inset-0 opacity-25">
          <div className="absolute inset-x-8 top-1/2 h-px border-t-2 border-dashed border-white/45" />
          <div className="absolute left-1/2 top-5 h-[calc(100%-2.5rem)] w-px -translate-x-1/2 border-l-2 border-dashed border-white/30" />
          <div className="absolute left-6 top-6 h-16 w-16 rounded-full border border-white/20" />
          <div className="absolute bottom-6 right-6 h-20 w-20 rounded-full border border-white/10" />
          <div className="absolute bottom-5 left-6 rounded-full bg-rose-700/80 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white shadow-lg">
            Leather Ball
          </div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/85 via-emerald-950/45 to-transparent" />

        <div className="relative flex min-h-[260px] flex-col justify-between p-5 md:min-h-[320px] md:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <Badge className={`border-0 font-semibold shadow-sm ${statusStyles[fixture.status]}`}>
                {fixture.status === "live" ? <Radio className="size-3.5" /> : <Trophy className="size-3.5" />}
                {formatStatus(fixture.status)}
              </Badge>
              <p className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-white/90">
                {fixture.seasonLabel}
              </p>
            </div>
            <div className="rounded-2xl bg-white/12 px-4 py-3 text-right shadow-lg backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/75">{dateLabel}</p>
              <p className="mt-1 text-2xl font-black">{timeLabel}</p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100/85">
              Game {fixture.gameNumber.toString().padStart(2, "0")}
            </p>
            <h3 className={isFeatured ? "text-3xl font-black leading-tight md:text-4xl" : "text-2xl font-black leading-tight"}>
              {fixtureMatchup(fixture)}
            </h3>
            <p className="text-sm font-medium text-emerald-50/90">
              {fixture.venueType === "away" ? "Away fixture" : fixture.venueType === "neutral" ? "Neutral venue" : "Home fixture"}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-5 p-5 md:p-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-emerald-50 p-4">
            <p className="mb-1 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-800">
              <CalendarDays className="size-4" />
              Date
            </p>
            <p className="text-sm font-semibold text-slate-900">{dateLabel}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="mb-1 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-700">
              <Clock3 className="size-4" />
              Start time
            </p>
            <p className="text-sm font-semibold text-slate-900">{timeLabel}</p>
          </div>
          <div className="rounded-2xl bg-amber-50 p-4">
            <p className="mb-1 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-800">
              <Trophy className="size-4" />
              Fixture
            </p>
            <p className="text-sm font-semibold text-slate-900">Game {fixture.gameNumber}</p>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-4">
          <p className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
            <MapPin className="size-4 text-emerald-700" />
            Venue
          </p>
          <p className="text-base font-bold text-slate-900">{fixture.venue || "Venue TBD"}</p>
          <p className="mt-1 text-sm text-slate-600">{fixture.location || "Location TBD"}</p>
        </div>

        {fixture.status === "completed" && (fixture.resultText || fixture.mvp) ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-950 p-4 text-white">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Result</p>
              <p className="mt-2 text-sm font-semibold">{fixture.resultText || "Result to be updated"}</p>
            </div>
            <div className="rounded-2xl bg-violet-50 p-4">
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-violet-800">
                <Star className="size-4" />
                MVP
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{fixture.mvp || "MVP to be updated"}</p>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {fixture.status === "live"
              ? "Live score and recap links are active for this fixture."
              : "Admins can update live score, result, MVP, and recap links as the season progresses."}
          </div>
        )}

        <div className="grid gap-2 sm:grid-cols-3">
          {fixture.liveScoreUrl ? (
            <a href={fixture.liveScoreUrl} target="_blank" rel="noreferrer">
              <Button variant="dark" size="sm" className="w-full">
                <Radio className="size-4" />
                Live Score
              </Button>
            </a>
          ) : (
            <Button variant="outline" size="sm" className="w-full" disabled>
              Live Score Soon
            </Button>
          )}

          {fixture.youtubeUrl ? (
            <a href={fixture.youtubeUrl} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm" className="w-full">
                <PlayCircle className="size-4" />
                YouTube
              </Button>
            </a>
          ) : (
            <Button variant="outline" size="sm" className="w-full" disabled>
              YouTube Soon
            </Button>
          )}

          <Button variant="outline" size="sm" className="w-full" onClick={() => onViewDetails?.(fixture)}>
            View Details
          </Button>
        </div>
      </div>
    </article>
  );
}
