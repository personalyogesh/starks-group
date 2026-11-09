import Link from "next/link";

import { PUBLIC_SITE } from "@/content/publicSite";
import Container from "@/components/ui/Container";

export default function LegacyPortalRetiredPage() {
  return (
    <Container className="py-14 sm:py-20 max-w-xl text-center">
      <p className="text-xs font-bold uppercase tracking-wide text-brand-gold">Starks Cricket</p>
      <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold text-brand-deep dark:text-slate-50">Member portal retired</h1>
      <p className="mt-4 text-slate-700 dark:text-slate-300 leading-relaxed">
        The previous sign-in, community feed and member dashboard ran on Firebase. We're focusing this site on public club
        information while <strong>{PUBLIC_SITE.myCricket360.title}</strong> is prepared for registration and team tools.
      </p>
      <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
        No action is required on your part. Historical club resources in git are preserved; live member data is not restored
        on this public site.
      </p>
      <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/"
          className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-brand-primary px-6 font-bold text-white"
        >
          Back to home
        </Link>
        <Link
          href="/contact"
          className="inline-flex min-h-[48px] items-center justify-center rounded-xl border-2 border-slate-300 px-6 font-bold text-slate-900 dark:border-slate-600 dark:text-slate-100"
        >
          Contact the club
        </Link>
      </div>
    </Container>
  );
}
