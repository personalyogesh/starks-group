import Image from "next/image";

import { PUBLIC_SITE, SPONSOR_HASHTAG_INDIA, SPONSORSHIP_SUPPORT } from "@/content/publicSite";
import Container from "@/components/ui/Container";
import { SocialHighlightsSection } from "@/components/public-site/sections/SocialHighlightsSection";
import { SupportStarksSection } from "@/components/public-site/sections/SupportStarksSection";

export default function PublicSponsorsPage() {
  const mailto = `mailto:${PUBLIC_SITE.contactEmail}?subject=${encodeURIComponent(SPONSORSHIP_SUPPORT.inquirySubject)}`;

  return (
    <Container className="py-10 sm:py-14 space-y-12">
      <header className="text-center max-w-2xl mx-auto">
        <p className="text-xs font-bold uppercase tracking-wide text-brand-gold">Sponsors &amp; partners</p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold text-brand-deep dark:text-slate-50">
          Powering Starks Cricket
        </h1>
        <p className="mt-3 text-slate-700 dark:text-slate-300">
          We highlight verified partners who help our cricket community. Match media stays on Instagram, Facebook and
          YouTube—linked from our Social highlights, not duplicated here.
        </p>
      </header>

      <article className="rounded-3xl border-2 border-brand-gold/40 bg-white shadow-sm overflow-hidden dark:border-brand-gold/30 dark:bg-slate-900">
        <div className="bg-gradient-to-br from-brand-deep to-brand-primary p-8 sm:p-10 text-center text-white">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-gold mb-4">Exclusive featured partner</p>
          <Image
            src={SPONSOR_HASHTAG_INDIA.logoSrc}
            alt={`${SPONSOR_HASHTAG_INDIA.name} logo`}
            width={320}
            height={140}
            className="mx-auto max-h-28 w-auto object-contain bg-white/95 rounded-xl p-4"
          />
        </div>
        <div className="p-6 sm:p-8 space-y-4">
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-50">{SPONSOR_HASHTAG_INDIA.name}</h2>
          <p className="text-sm font-semibold text-brand-primary">{SPONSOR_HASHTAG_INDIA.tagline}</p>
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{SPONSOR_HASHTAG_INDIA.description}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{SPONSOR_HASHTAG_INDIA.location}</p>
          <p className="text-sm text-slate-600 dark:text-slate-400 border-l-4 border-brand-gold pl-3">
            {SPONSOR_HASHTAG_INDIA.exclusivityBlurb}
          </p>
          <a
            href={SPONSOR_HASHTAG_INDIA.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[48px] items-center rounded-xl bg-brand-primary px-6 py-3 font-bold text-white"
          >
            Follow {SPONSOR_HASHTAG_INDIA.instagramHandle}
          </a>
        </div>
      </article>

      <SupportStarksSection />

      <SocialHighlightsSection id="sponsors-social-highlights" />

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center max-w-xl mx-auto dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-extrabold text-brand-deep dark:text-slate-50">Partnership enquiries</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Email the club using verified contact details. We do not process sponsorship payments on this website.
        </p>
        <a href={mailto} className="mt-4 inline-flex min-h-[48px] items-center rounded-xl border-2 border-brand-primary px-6 font-bold text-brand-primary">
          {PUBLIC_SITE.contactEmail}
        </a>
      </section>
    </Container>
  );
}
