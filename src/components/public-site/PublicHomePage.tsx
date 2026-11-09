import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Youtube } from "lucide-react";

import {
  CLUB_ANNOUNCEMENTS,
  getPublicMegaSmashFixtures,
  PUBLIC_SITE,
  VERIFIED_MATCH_RESULTS,
} from "@/content/publicSite";
import type { KeyMomentYearGroup } from "@/lib/localKeyMoments";
import Container from "@/components/ui/Container";
import { ClubAchievementsSection } from "@/components/public-site/sections/ClubAchievementsSection";
import { FeaturedSponsorSection } from "@/components/public-site/sections/FeaturedSponsorSection";
import { FixtureCardList } from "@/components/public-site/sections/FixtureCardList";
import { SocialHighlightsSection } from "@/components/public-site/sections/SocialHighlightsSection";
import { SupportStarksSection } from "@/components/public-site/sections/SupportStarksSection";

type Props = {
  keyMomentYears: KeyMomentYearGroup[];
};

export default function PublicHomePage({ keyMomentYears }: Props) {
  const { upcoming, recent } = getPublicMegaSmashFixtures(new Date());
  const heroImage =
    keyMomentYears[0]?.images[0]?.src ?? keyMomentYears.find((g) => g.year === "2026")?.images[0]?.src;
  const previewMoments = keyMomentYears.flatMap((g) => g.images).slice(0, 6);

  return (
    <>
      <section className="relative overflow-hidden border-b border-slate-200 dark:border-slate-800">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-deep via-brand-primary to-slate-900" aria-hidden />
        <div className="absolute inset-0 opacity-20 bg-pitch-lines bg-pitch-lines" aria-hidden />
        {heroImage ? (
          <div className="absolute inset-0 opacity-30">
            <Image src={heroImage} alt="" fill className="object-cover" sizes="100vw" priority />
          </div>
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/50 to-slate-950/30" aria-hidden />

        <Container className="relative z-10 py-14 sm:py-20">
          <p className="text-xs sm:text-sm font-bold uppercase tracking-[0.2em] text-brand-gold">{PUBLIC_SITE.clubName}</p>
          <h1 className="mt-3 max-w-xl text-3xl sm:text-4xl md:text-5xl font-extrabold text-white leading-tight">
            {PUBLIC_SITE.tagline}
          </h1>
          <p className="mt-4 max-w-lg text-base sm:text-lg text-white/85 leading-relaxed">{PUBLIC_SITE.heroIntro}</p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link
              href="/about"
              className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-white px-6 py-3 text-base font-bold text-brand-deep"
            >
              Explore Our Club
            </Link>
            <a
              href={PUBLIC_SITE.social.youtube}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border-2 border-white/40 px-6 py-3 text-base font-bold text-white hover:bg-white/10"
            >
              <Youtube className="size-5" aria-hidden />
              Match Highlights
            </a>
          </div>
        </Container>
      </section>

      <Container className="py-12 sm:py-16 space-y-16">
        <section id="about" className="max-w-3xl">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-brand-deep dark:text-slate-50">About Starks</h2>
          <p className="mt-4 text-slate-700 dark:text-slate-300 leading-relaxed text-base sm:text-lg">
            {PUBLIC_SITE.aboutBlurb}
          </p>
          <Link href="/about" className="mt-4 inline-flex items-center gap-1 font-semibold text-brand-primary">
            Learn more <ArrowRight className="size-4" aria-hidden />
          </Link>
        </section>

        <SocialHighlightsSection />

        {CLUB_ANNOUNCEMENTS.length > 0 ? (
          <section aria-labelledby="announcements-heading">
            <h2 id="announcements-heading" className="text-2xl font-extrabold text-brand-deep dark:text-slate-50">
              Club announcements
            </h2>
            <ul className="mt-4 grid gap-3">
              {CLUB_ANNOUNCEMENTS.slice(0, 5).map((item) => (
                <li
                  key={item.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="text-xs font-semibold text-slate-500">{item.date}</div>
                  <div className="mt-1 font-bold text-slate-900 dark:text-slate-50">{item.title}</div>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{item.summary}</p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <ClubAchievementsSection />

        <section aria-labelledby="fixtures-heading">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 id="fixtures-heading" className="text-2xl font-extrabold text-brand-deep dark:text-slate-50">
              Upcoming fixtures
            </h2>
            <Link href="/matches" className="text-sm font-semibold text-brand-primary">
              All matches
            </Link>
          </div>
          <div className="mt-4">
            <FixtureCardList
              fixtures={upcoming.slice(0, 4)}
              emptyMessage="No upcoming fixtures are listed yet. Check back soon or visit our matches page."
            />
          </div>
        </section>

        <section aria-labelledby="results-heading">
          <h2 id="results-heading" className="text-2xl font-extrabold text-brand-deep dark:text-slate-50">
            Recent results
          </h2>
          {VERIFIED_MATCH_RESULTS.length > 0 ? (
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {VERIFIED_MATCH_RESULTS.slice(0, 4).map((r) => (
                <li
                  key={r.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="text-xs font-bold uppercase text-brand-primary">{r.seasonLabel ?? "Result"}</div>
                  <div className="font-bold mt-1">vs {r.opponent}</div>
                  <div className="text-sm text-slate-500">{r.date}</div>
                  <p className="text-sm mt-2 text-slate-700 dark:text-slate-300">{r.resultSummary}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-slate-600 dark:border-slate-700 dark:bg-slate-900/40">
              Verified results will appear here when published. Season schedule games without published scores are shown under
              matches only.
            </p>
          )}
        </section>

        <FeaturedSponsorSection />

        <SupportStarksSection compact />

        <section aria-labelledby="gallery-heading">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 id="gallery-heading" className="text-2xl font-extrabold text-brand-deep dark:text-slate-50">
              Match-day memories
            </h2>
            <Link href="/gallery" className="text-sm font-semibold text-brand-primary">
              Full gallery
            </Link>
          </div>
          {previewMoments.length > 0 ? (
            <ul className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
              {previewMoments.map((img) => (
                <li key={img.id} className="relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-200">
                  <Image src={img.src} alt={img.title} fill className="object-cover" sizes="(max-width: 640px) 50vw, 33vw" />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-slate-600 dark:text-slate-400">Photos coming soon in the gallery.</p>
          )}
        </section>

        <section className="rounded-2xl border border-brand-primary/20 bg-brand-primary/5 p-6 sm:p-8">
          <h2 className="text-xl font-extrabold text-brand-deep dark:text-slate-50">{PUBLIC_SITE.myCricket360.title}</h2>
          <span className="mt-1 inline-block text-xs font-bold uppercase tracking-wide text-brand-primary">Coming soon</span>
          <p className="mt-3 text-slate-700 dark:text-slate-300 max-w-2xl">{PUBLIC_SITE.myCricket360.blurb}</p>
        </section>
      </Container>
    </>
  );
}
