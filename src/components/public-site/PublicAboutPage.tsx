import { PUBLIC_SITE, SPONSORSHIP_SUPPORT } from "@/content/publicSite";
import Container from "@/components/ui/Container";

export default function PublicAboutPage() {
  return (
    <Container className="py-10 sm:py-14 max-w-3xl">
      <h1 className="text-3xl sm:text-4xl font-extrabold text-brand-deep dark:text-slate-50">About Starks Cricket</h1>
      <p className="mt-6 text-lg text-slate-700 dark:text-slate-300 leading-relaxed">{PUBLIC_SITE.aboutBlurb}</p>
      <p className="mt-4 text-slate-700 dark:text-slate-300 leading-relaxed">
        Since {PUBLIC_SITE.established}, we've grown as a cricket family rooted in {PUBLIC_SITE.location} and the wider
        Triangle. On match days and off the field, we focus on teamwork, respect and community.
      </p>
      <p className="mt-4 text-slate-700 dark:text-slate-300 leading-relaxed text-sm sm:text-base">
        {SPONSORSHIP_SUPPORT.ecosystemNote}
      </p>
      <p className="mt-4 text-slate-700 dark:text-slate-300 leading-relaxed">
        Interested in playing, volunteering or partnering with the club? Visit our{" "}
        <a href="/contact" className="font-semibold text-brand-primary underline-offset-2 hover:underline">
          contact page
        </a>
        .
      </p>
    </Container>
  );
}
