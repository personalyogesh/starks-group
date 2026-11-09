import Image from "next/image";
import Link from "next/link";
import { Instagram } from "lucide-react";

import { SPONSOR_HASHTAG_INDIA, SPONSORSHIP_SUPPORT } from "@/content/publicSite";

export function FeaturedSponsorSection() {
  return (
    <section
      aria-labelledby="featured-sponsor-heading"
      className="rounded-3xl overflow-hidden border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="bg-brand-deep px-6 py-3 text-center text-xs font-bold uppercase tracking-wide text-brand-gold">
        Featured partner · Cary, NC
      </div>
      <div className="grid md:grid-cols-2">
        <div className="p-6 sm:p-8 flex flex-col justify-center">
          <h2 id="featured-sponsor-heading" className="text-2xl font-extrabold text-slate-900 dark:text-slate-50">
            {SPONSOR_HASHTAG_INDIA.name}
          </h2>
          <p className="text-sm font-semibold text-brand-primary mt-1">{SPONSOR_HASHTAG_INDIA.tagline}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{SPONSOR_HASHTAG_INDIA.location}</p>
          <p className="mt-3 text-slate-700 dark:text-slate-300 leading-relaxed">{SPONSOR_HASHTAG_INDIA.description}</p>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">{SPONSOR_HASHTAG_INDIA.exclusivityBlurb}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/sponsors"
              className="inline-flex min-h-[44px] items-center rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-bold text-white"
            >
              Sponsors &amp; partners
            </Link>
            <a
              href={SPONSOR_HASHTAG_INDIA.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              <Instagram className="size-4" aria-hidden />
              {SPONSOR_HASHTAG_INDIA.instagramHandle}
            </a>
          </div>
        </div>
        <div className="relative bg-slate-100 dark:bg-slate-800/80 min-h-[200px] md:min-h-[280px] flex items-center justify-center p-8">
          <Image
            src={SPONSOR_HASHTAG_INDIA.logoSrc}
            alt={`${SPONSOR_HASHTAG_INDIA.name} logo`}
            width={280}
            height={120}
            className="max-h-32 w-auto object-contain"
          />
        </div>
      </div>
      <p className="px-6 pb-4 text-xs text-slate-500 dark:text-slate-400 text-center">{SPONSORSHIP_SUPPORT.exclusivityNote}</p>
    </section>
  );
}
