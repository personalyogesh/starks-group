import { ClubSocialLinks } from "@/components/public-site/ClubSocialLinks";
import { PUBLIC_SITE } from "@/content/publicSite";
import Container from "@/components/ui/Container";

export default function PublicContactPage() {
  return (
    <Container className="py-10 sm:py-14 max-w-2xl">
      <h1 className="text-3xl sm:text-4xl font-extrabold text-brand-deep dark:text-slate-50">Contact</h1>
      <p className="mt-4 text-slate-700 dark:text-slate-300">
        Reach out for general enquiries, volunteering or partnership opportunities.
      </p>

      <dl className="mt-8 space-y-6">
        <div>
          <dt className="text-sm font-bold uppercase tracking-wide text-slate-500">Email</dt>
          <dd className="mt-1">
            <a href={`mailto:${PUBLIC_SITE.contactEmail}`} className="text-lg font-semibold text-brand-primary">
              {PUBLIC_SITE.contactEmail}
            </a>
          </dd>
        </div>
        <div>
          <dt className="text-sm font-bold uppercase tracking-wide text-slate-500">Phone</dt>
          <dd className="mt-1">
            <a href={`tel:${PUBLIC_SITE.contactPhone.replace(/\s/g, "")}`} className="text-lg font-semibold">
              {PUBLIC_SITE.contactPhone}
            </a>
          </dd>
        </div>
        <div>
          <dt className="text-sm font-bold uppercase tracking-wide text-slate-500">Location</dt>
          <dd className="mt-1 text-lg">{PUBLIC_SITE.location}</dd>
        </div>
      </dl>

      <h2 className="mt-10 text-xl font-extrabold">Social</h2>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
        Match photos, videos and celebrations live on our official channels.
      </p>
      <ClubSocialLinks variant="contact" />

      <p className="mt-10 text-sm text-slate-600 dark:text-slate-400 rounded-xl bg-slate-100 dark:bg-slate-900 p-4">
        Player registration and private member tools are moving to <strong>My Cricket 360</strong> (coming soon). This
        contact page is for public club enquiries only.
      </p>
    </Container>
  );
}
