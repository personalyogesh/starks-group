import { Calendar, MapPin } from "lucide-react";

import type { PublicFixture } from "@/content/publicSite";

function formatDisplayDate(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

export function FixtureCardList({ fixtures, emptyMessage }: { fixtures: PublicFixture[]; emptyMessage: string }) {
  if (fixtures.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-300 bg-white/80 px-4 py-8 text-center text-slate-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300">
        {emptyMessage}
      </p>
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {fixtures.map((f) => (
        <li
          key={f.id}
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="text-xs font-bold uppercase tracking-wide text-brand-primary">{f.seasonLabel}</div>
          <h3 className="mt-1 text-lg font-extrabold text-slate-900 dark:text-slate-50">
            Starks vs {f.opponent}
          </h3>
          <p className="text-sm text-slate-500 mt-0.5 capitalize">{f.starksRole === "home" ? "Home" : "Away"} · Game {f.gameNumber}</p>
          <div className="mt-3 flex flex-col gap-2 text-sm text-slate-700 dark:text-slate-300">
            <span className="inline-flex items-center gap-2">
              <Calendar className="size-4 shrink-0 text-brand-gold" aria-hidden />
              {formatDisplayDate(f.date)} · {f.timeLabel}
            </span>
            <span className="inline-flex items-start gap-2">
              <MapPin className="size-4 shrink-0 text-brand-gold mt-0.5" aria-hidden />
              <span>
                {f.venue}
                <span className="text-slate-500"> · {f.location}</span>
              </span>
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
