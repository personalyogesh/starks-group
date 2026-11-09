import { Facebook, Instagram, Youtube } from "lucide-react";

import { PUBLIC_SITE } from "@/content/publicSite";

const PRIMARY_CHANNELS = [
  {
    key: "instagram",
    href: PUBLIC_SITE.social.instagram,
    label: "Instagram",
    detail: "@starkscricketclub",
    Icon: Instagram,
  },
  {
    key: "facebook",
    href: PUBLIC_SITE.social.facebook,
    label: "Facebook",
    detail: "Club updates",
    Icon: Facebook,
  },
  {
    key: "youtube",
    href: PUBLIC_SITE.social.youtube,
    label: "YouTube",
    detail: "Match highlights",
    Icon: Youtube,
  },
] as const;

type Variant = "footer" | "contact" | "toolbar";

export function ClubSocialLinks({ variant = "contact" }: { variant?: Variant }) {
  if (variant === "footer") {
    return (
      <ul className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
        {PRIMARY_CHANNELS.map(({ key, href, label, Icon }) => (
          <li key={key}>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/15 transition"
            >
              <Icon className="size-5 shrink-0" aria-hidden />
              {label}
            </a>
          </li>
        ))}
      </ul>
    );
  }

  if (variant === "toolbar") {
    return (
      <div className="flex flex-wrap gap-2">
        {PRIMARY_CHANNELS.map(({ key, href, label, Icon }) => (
          <a
            key={key}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            <Icon className="size-4 shrink-0 text-brand-primary" aria-hidden />
            {label}
          </a>
        ))}
      </div>
    );
  }

  return (
    <ul className="mt-4 grid gap-3">
      {PRIMARY_CHANNELS.map(({ key, href, label, detail, Icon }) => (
        <li key={key}>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[52px] items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-semibold text-brand-primary hover:border-brand-primary/40 dark:border-slate-800 dark:bg-slate-900"
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
              <Icon className="size-5" aria-hidden />
            </span>
            <span>
              <span className="block text-slate-900 dark:text-slate-50">{label}</span>
              <span className="block text-sm font-normal text-slate-600 dark:text-slate-400">{detail}</span>
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
