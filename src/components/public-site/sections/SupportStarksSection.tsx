import { Mail } from "lucide-react";

import { PUBLIC_SITE, SPONSORSHIP_SUPPORT } from "@/content/publicSite";

export function SupportStarksSection({ compact = false }: { compact?: boolean }) {
  const mailto = `mailto:${PUBLIC_SITE.contactEmail}?subject=${encodeURIComponent(SPONSORSHIP_SUPPORT.inquirySubject)}`;

  return (
    <section
      aria-labelledby="support-starks-heading"
      className="rounded-3xl border border-brand-gold/30 bg-gradient-to-br from-white to-brand-bg p-6 sm:p-8 dark:from-slate-900 dark:to-slate-950 dark:border-brand-gold/20"
    >
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-gold">Sponsorship</p>
      <h2 id="support-starks-heading" className="mt-2 text-2xl sm:text-3xl font-extrabold text-brand-deep dark:text-slate-50">
        {SPONSORSHIP_SUPPORT.headline}
      </h2>
      <p className="mt-4 text-slate-700 dark:text-slate-300 leading-relaxed max-w-2xl text-sm sm:text-base">
        {SPONSORSHIP_SUPPORT.body}
      </p>
      {!compact ? (
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 max-w-2xl">{SPONSORSHIP_SUPPORT.exclusivityNote}</p>
      ) : null}
      <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 max-w-2xl">{SPONSORSHIP_SUPPORT.ecosystemNote}</p>
      <a
        href={mailto}
        className="mt-6 inline-flex min-h-[48px] w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-brand-primary px-6 py-3 text-base font-bold text-white hover:bg-brand-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 dark:ring-offset-slate-950"
      >
        <Mail className="size-5" aria-hidden />
        {SPONSORSHIP_SUPPORT.inquiryCtaLabel}
      </a>
      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">No online payments on this site—enquiries only via {PUBLIC_SITE.contactEmail}.</p>
    </section>
  );
}
