import { VERIFIED_CLUB_HIGHLIGHTS } from "@/content/publicSite";

export function ClubAchievementsSection({ id = "club-highlights" }: { id?: string }) {
  if (VERIFIED_CLUB_HIGHLIGHTS.length === 0) return null;

  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="text-2xl font-extrabold text-brand-deep dark:text-slate-50">
        Club highlights
      </h2>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
        Participation and milestones we can verify from club records—not audience estimates or unofficial awards.
      </p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-3">
        {VERIFIED_CLUB_HIGHLIGHTS.map((item) => (
          <li
            key={item.id}
            className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
          >
            <h3 className="font-extrabold text-slate-900 dark:text-slate-50">{item.title}</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{item.detail}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
