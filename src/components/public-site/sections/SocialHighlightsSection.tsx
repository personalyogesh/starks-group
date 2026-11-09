import { ExternalLink, Facebook, Instagram, Youtube } from "lucide-react";

import { SOCIAL_HIGHLIGHTS, type SocialHighlightPlatform } from "@/content/publicSite";

const platformLabel: Record<SocialHighlightPlatform, string> = {
  instagram: "Instagram",
  youtube: "YouTube",
  facebook: "Facebook",
  x: "X",
};

function PlatformIcon({ platform }: { platform: SocialHighlightPlatform }) {
  const className = "size-5 shrink-0";
  switch (platform) {
    case "instagram":
      return <Instagram className={className} aria-hidden />;
    case "youtube":
      return <Youtube className={className} aria-hidden />;
    case "facebook":
      return <Facebook className={className} aria-hidden />;
    default:
      return <ExternalLink className={className} aria-hidden />;
  }
}

export function SocialHighlightsSection({ id = "social-highlights" }: { id?: string }) {
  if (SOCIAL_HIGHLIGHTS.length === 0) return null;

  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="text-2xl font-extrabold text-brand-deep dark:text-slate-50">
        Social highlights
      </h2>
      <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl">
        Ongoing match photos, videos and celebrations live on our social channels. This site links to verified posts only—we
        do not host or auto-sync social media here.
      </p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {SOCIAL_HIGHLIGHTS.map((item) => (
          <li key={item.id}>
            <a
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-[72px] flex-col justify-center rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-brand-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary dark:border-slate-800 dark:bg-slate-900"
            >
              <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-brand-primary">
                <PlatformIcon platform={item.platform} />
                {platformLabel[item.platform]}
                {item.isChannelLink ? " · Channel" : " · Post"}
              </span>
              <span className="mt-1 font-bold text-slate-900 dark:text-slate-50">{item.title}</span>
              {item.description ? (
                <span className="mt-1 text-sm text-slate-600 dark:text-slate-400">{item.description}</span>
              ) : null}
              <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand-primary">
                Open link <ExternalLink className="size-3.5" aria-hidden />
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
