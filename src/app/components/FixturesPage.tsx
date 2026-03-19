"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Clock3, MapPin, PlayCircle, Radio, Trophy } from "lucide-react";

import FixtureCard from "@/app/components/FixtureCard";
import Modal from "@/components/ui/Modal";
import Container from "@/components/ui/Container";
import Card, { CardBody } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Badge } from "@/app/components/ui/badge";
import { FIXTURE_SEASON_OPTIONS } from "@/data/starksFixtures2026";
import {
  type Fixture,
  subscribeToPublicFixtures,
} from "@/lib/firebase/fixturesService";
import { fixtureDate, fixtureMatchup, fixtureStatusLabel, isFixtureUpcoming } from "@/lib/fixtures";

type SeasonFilter = "all" | (typeof FIXTURE_SEASON_OPTIONS)[number]["key"];

function formatDate(date: Date | null) {
  if (!date) return "Date TBD";
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(date: Date | null) {
  if (!date) return "Time TBD";
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function FixturesPage() {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [seasonFilter, setSeasonFilter] = useState<SeasonFilter>("all");
  const [selectedFixture, setSelectedFixture] = useState<Fixture | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToPublicFixtures(
      (incoming) => {
        setFixtures(incoming.filter((fixture) => fixture.seasonYear === 2026));
        setLoading(false);
      },
      {
        onError: () => {
          setFixtures([]);
          setLoading(false);
        },
      },
    );
    return unsubscribe;
  }, []);

  const stats = useMemo(() => {
    const upcoming = fixtures.filter(isFixtureUpcoming).length;
    const live = fixtures.filter((fixture) => fixture.status === "live").length;
    const completed = fixtures.filter((fixture) => fixture.status === "completed").length;
    return { total: fixtures.length, upcoming, live, completed };
  }, [fixtures]);

  const filteredFixtures = useMemo(() => {
    return seasonFilter === "all"
      ? fixtures
      : fixtures.filter((fixture) => fixture.seasonKey === seasonFilter);
  }, [fixtures, seasonFilter]);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f5fff7_0%,#ffffff_30%,#f8fafc_100%)]">
      <section className="relative overflow-hidden border-b border-emerald-950/10 py-8 text-white md:py-12">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#052e16_0%,#166534_48%,#14532d_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_35%)]" />
        <div
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.18) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        <Container>
          <div className="relative space-y-6">
            <div className="space-y-4">
              <Badge className="border-0 bg-white/12 px-4 py-1.5 text-white shadow-sm">Starks 2026 Match Center</Badge>
              <div className="max-w-4xl space-y-3">
                <h1 className="text-3xl font-black text-white drop-shadow-sm md:text-5xl">Upcoming Fixtures and Results</h1>
                <p className="text-base text-emerald-50/85 md:text-lg">
                  Follow Mega Bash 2026 and Mega Smash 2026 with live score links, results, MVP updates, and recap links.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Card className="border-white/10 bg-white/10 text-white shadow-none">
                <CardBody>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/60">Season fixtures</p>
                  <p className="mt-2 text-3xl font-black">{stats.total}</p>
                </CardBody>
              </Card>
              <Card className="border-white/10 bg-white/10 text-white shadow-none">
                <CardBody>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/60">Upcoming</p>
                  <p className="mt-2 text-3xl font-black">{stats.upcoming}</p>
                </CardBody>
              </Card>
              <Card className="border-white/10 bg-white/10 text-white shadow-none">
                <CardBody>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/60">Live now</p>
                  <p className="mt-2 text-3xl font-black">{stats.live}</p>
                </CardBody>
              </Card>
              <Card className="border-white/10 bg-white/10 text-white shadow-none">
                <CardBody>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/60">Completed</p>
                  <p className="mt-2 text-3xl font-black">{stats.completed}</p>
                </CardBody>
              </Card>
            </div>
          </div>
        </Container>
      </section>

      <Container>
        <div className="space-y-6 py-8 md:py-10">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setSeasonFilter("all")}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                seasonFilter === "all"
                  ? "bg-gradient-to-r from-emerald-700 to-emerald-600 text-white shadow-md"
                  : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-emerald-50"
              }`}
            >
              All fixtures
            </button>
            {FIXTURE_SEASON_OPTIONS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setSeasonFilter(item.key)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                  seasonFilter === item.key
                    ? "bg-gradient-to-r from-emerald-700 to-emerald-600 text-white shadow-md"
                    : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-emerald-50"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="grid gap-5 xl:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={`fixtures-loading-${index}`} className="h-[420px] animate-pulse rounded-[28px] bg-slate-200/70" />
              ))}
            </div>
          ) : filteredFixtures.length > 0 ? (
            <div className="grid gap-5 xl:grid-cols-2">
              {filteredFixtures.map((fixture, index) => (
                <FixtureCard
                  key={fixture.id}
                  fixture={fixture}
                  variant={index === 0 ? "featured" : "default"}
                  onViewDetails={setSelectedFixture}
                />
              ))}
            </div>
          ) : (
            <Card className="rounded-[28px] border-dashed border-slate-300 shadow-none">
              <CardBody>
                <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 p-8 text-center">
                  <Trophy className="size-10 text-emerald-700" />
                  <h2 className="text-2xl font-black text-slate-900">No fixtures available</h2>
                  <p className="max-w-2xl text-slate-600">
                    The 2026 Starks fixtures have not been published yet. Admins can load the season templates and publish
                    matches from the fixtures manager.
                  </p>
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      </Container>

      <Modal
        open={Boolean(selectedFixture)}
        onClose={() => setSelectedFixture(null)}
        title={selectedFixture ? fixtureMatchup(selectedFixture) : "Fixture details"}
        maxWidthClassName="max-w-3xl"
        footer={
          selectedFixture ? (
            <div className="grid w-full gap-2 sm:grid-cols-3">
              {selectedFixture.liveScoreUrl ? (
                <a href={selectedFixture.liveScoreUrl} target="_blank" rel="noreferrer">
                  <Button variant="dark" className="w-full">
                    <Radio className="size-4" />
                    Live Score
                  </Button>
                </a>
              ) : (
                <Button variant="outline" className="w-full" disabled>
                  Live Score Soon
                </Button>
              )}
              {selectedFixture.youtubeUrl ? (
                <a href={selectedFixture.youtubeUrl} target="_blank" rel="noreferrer">
                  <Button variant="outline" className="w-full">
                    <PlayCircle className="size-4" />
                    Watch on YouTube
                  </Button>
                </a>
              ) : (
                <Button variant="outline" className="w-full" disabled>
                  YouTube Soon
                </Button>
              )}
            </div>
          ) : null
        }
      >
        {selectedFixture ? (
          <div className="space-y-4">
            <div className="text-sm text-slate-600">
              Game {selectedFixture.gameNumber} · {selectedFixture.seasonLabel} · {fixtureStatusLabel(selectedFixture.status)}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border bg-slate-50 p-4">
                <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <CalendarDays className="size-4 text-emerald-700" />
                  Match date
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{formatDate(fixtureDate(selectedFixture.date))}</p>
              </div>
              <div className="rounded-2xl border bg-slate-50 p-4">
                <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <Clock3 className="size-4 text-emerald-700" />
                  Start time
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{formatTime(fixtureDate(selectedFixture.date))}</p>
              </div>
              <div className="rounded-2xl border bg-slate-50 p-4">
                <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <MapPin className="size-4 text-emerald-700" />
                  Venue
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{selectedFixture.venue || "Venue TBD"}</p>
                <p className="mt-1 text-sm text-slate-600">{selectedFixture.location || "Location TBD"}</p>
              </div>
              <div className="rounded-2xl border bg-slate-50 p-4">
                <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <Trophy className="size-4 text-emerald-700" />
                  Match status
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{fixtureStatusLabel(selectedFixture.status)}</p>
                {selectedFixture.resultText ? (
                  <p className="mt-1 text-sm text-slate-600">{selectedFixture.resultText}</p>
                ) : null}
              </div>
            </div>

            {selectedFixture.notes ? (
              <div className="rounded-2xl border bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Match notes</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{selectedFixture.notes}</p>
              </div>
            ) : null}

            {selectedFixture.mvp ? (
              <div className="rounded-2xl bg-violet-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Match MVP</p>
                <p className="mt-2 text-base font-bold text-slate-900">{selectedFixture.mvp}</p>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
