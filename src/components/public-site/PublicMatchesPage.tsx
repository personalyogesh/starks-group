import Link from "next/link";

import {
  getPublicMegaSmashFixtures,
  PUBLIC_SITE,
  VERIFIED_MATCH_RESULTS,
} from "@/content/publicSite";
import Container from "@/components/ui/Container";
import { FixtureCardList } from "@/components/public-site/sections/FixtureCardList";

export default function PublicMatchesPage() {
  const { upcoming, recent: pastSchedule } = getPublicMegaSmashFixtures(new Date(), { recentLimit: 32 });

  return (
    <Container className="py-10 sm:py-14 space-y-12">
      <header className="max-w-2xl">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-brand-deep dark:text-slate-50">Matches</h1>
        <p className="mt-3 text-slate-700 dark:text-slate-300">
          Official Mega Smash 2026 fixtures for Starks Cricket. Scores and outcomes are listed only when verified.
        </p>
      </header>

      <section>
        <h2 className="text-xl font-extrabold text-brand-deep dark:text-slate-50">Upcoming fixtures</h2>
        <div className="mt-4">
          <FixtureCardList fixtures={upcoming} emptyMessage="No upcoming fixtures in the published schedule." />
        </div>
      </section>

      <section>
        <h2 className="text-xl font-extrabold text-brand-deep dark:text-slate-50">Season schedule — completed dates</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Past games from the published schedule (without invented scores).
        </p>
        <div className="mt-4">
          <FixtureCardList fixtures={pastSchedule} emptyMessage="No past schedule items to show." />
        </div>
      </section>

      <section>
        <h2 className="text-xl font-extrabold text-brand-deep dark:text-slate-50">Recent results</h2>
        {VERIFIED_MATCH_RESULTS.length > 0 ? (
          <ul className="mt-4 space-y-3">
            {VERIFIED_MATCH_RESULTS.map((r) => (
              <li key={r.id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="font-bold">Starks vs {r.opponent}</div>
                <div className="text-sm text-slate-500">{r.date} · {r.venue}</div>
                <p className="mt-2 text-slate-700 dark:text-slate-300">{r.resultSummary}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-slate-600">
            No verified results published yet.
            {PUBLIC_SITE.liveScoringUrl ? (
              <>
                {" "}
                <a href={PUBLIC_SITE.liveScoringUrl} className="font-semibold text-brand-primary" target="_blank" rel="noopener noreferrer">
                  View live scoring
                </a>
              </>
            ) : (
              <>
                {" "}
                Follow{" "}
                <a href={PUBLIC_SITE.social.youtube} className="font-semibold text-brand-primary" target="_blank" rel="noopener noreferrer">
                  match highlights on YouTube
                </a>{" "}
                for updates.
              </>
            )}
          </p>
        )}
      </section>

      <section className="rounded-2xl bg-slate-100 dark:bg-slate-900 p-6">
        <h2 className="font-extrabold text-brand-deep dark:text-slate-50">Season highlights</h2>
        <p className="mt-2 text-slate-700 dark:text-slate-300 text-sm">
          Photo memories from match days live on our gallery. Video recaps are on YouTube when available.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/gallery" className="rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-bold text-white min-h-[44px] inline-flex items-center">
            Gallery
          </Link>
          <a
            href={PUBLIC_SITE.social.youtube}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-bold min-h-[44px] inline-flex items-center text-slate-900 dark:border-slate-600 dark:text-slate-100"
          >
            YouTube
          </a>
        </div>
      </section>
    </Container>
  );
}
