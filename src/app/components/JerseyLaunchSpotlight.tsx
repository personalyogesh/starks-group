"use client";

import { MapPin, Radio, Shirt } from "lucide-react";

import Button from "@/components/ui/Button";
import {
  getJerseyLaunchFacebookEventUrl,
  JERSEY_LAUNCH_LOCATION,
  JERSEY_LAUNCH_MAPS_URL,
  JERSEY_LAUNCH_VENUE,
  JERSEY_LAUNCH_YEAR,
} from "@/data/jerseyLaunchSpotlight";

export default function JerseyLaunchSpotlight() {
  const facebookEventUrl = getJerseyLaunchFacebookEventUrl();

  return (
    <section className="px-4" aria-labelledby="jersey-launch-heading">
      <div className="mx-auto max-w-6xl">
        <div className="relative overflow-hidden rounded-[28px] border border-indigo-200/80 bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#4c1d95] p-6 shadow-xl sm:p-8 md:p-10">
          <div
            className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-amber-400/15 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-20 -left-10 size-72 rounded-full bg-sky-400/10 blur-3xl"
            aria-hidden
          />

          <div className="relative grid gap-8 lg:grid-cols-[1.15fr,0.85fr] lg:items-center">
            <div className="space-y-4 text-white">
              <div className="inline-flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/40 bg-amber-400/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-amber-200">
                  <Radio className="size-3.5" aria-hidden />
                  Facebook Live
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/90">
                  <Shirt className="size-3.5" aria-hidden />
                  Starks {JERSEY_LAUNCH_YEAR} Kit
                </span>
              </div>

              <h2 id="jersey-launch-heading" className="text-3xl font-black tracking-tight sm:text-4xl md:text-[2.35rem] md:leading-tight">
                New threads. Same Starks pride.
              </h2>

              <p className="max-w-xl text-base leading-relaxed text-indigo-100/95 sm:text-lg">
                We&apos;re dropping the official <strong className="font-semibold text-white">{JERSEY_LAUNCH_YEAR} jersey</strong>{" "}
                with a live reveal you won&apos;t want to miss. Tune in on Facebook, celebrate with the club, and grab the link to
                RSVP or set a reminder on the event page.
              </p>

              <div className="flex flex-wrap items-center gap-3 text-sm text-indigo-100/90">
                <span className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-black/20 px-4 py-2">
                  <MapPin className="size-4 shrink-0 text-amber-200" aria-hidden />
                  <span>
                    <span className="font-semibold text-white">{JERSEY_LAUNCH_VENUE}</span>
                    <span className="text-indigo-200"> · {JERSEY_LAUNCH_LOCATION}</span>
                  </span>
                </span>
              </div>

              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:flex-wrap sm:items-center">
                {facebookEventUrl ? (
                  <a
                    href={facebookEventUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto"
                  >
                    <Button
                      variant="dark"
                      className="inline-flex w-full items-center justify-center rounded-2xl border-0 bg-gradient-to-r from-amber-400 to-amber-500 px-7 py-3.5 text-base font-bold text-slate-950 shadow-lg shadow-amber-900/30 hover:from-amber-300 hover:to-amber-400 sm:w-auto"
                    >
                      Open Facebook event
                    </Button>
                  </a>
                ) : (
                  <p className="rounded-2xl border border-dashed border-white/25 bg-white/5 px-4 py-3 text-sm text-indigo-100">
                    Add{" "}
                    <code className="rounded bg-black/30 px-1.5 py-0.5 text-xs text-amber-100">
                      NEXT_PUBLIC_STARKS_JERSEY_LAUNCH_FB_URL
                    </code>{" "}
                    to your env with your Facebook event URL to enable the button.
                  </p>
                )}
                <a
                  href={JERSEY_LAUNCH_MAPS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto"
                >
                  <Button
                    variant="outline"
                    className="inline-flex w-full min-h-[2.75rem] flex-row items-center justify-center gap-2 rounded-2xl border-white/25 bg-white/10 px-6 py-3.5 text-base font-semibold text-white hover:bg-white/15 sm:w-auto sm:min-h-0"
                  >
                    <MapPin className="size-4 shrink-0" aria-hidden />
                    Venue on Maps
                  </Button>
                </a>
              </div>
            </div>

            <div className="relative rounded-[22px] border border-white/10 bg-white/5 p-6 backdrop-blur-sm lg:p-8">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-200/90">At a glance</p>
              <ul className="mt-4 space-y-3 text-sm leading-relaxed text-indigo-50">
                <li className="flex gap-2">
                  <span className="mt-0.5 font-bold text-amber-300">→</span>
                  <span>
                    <strong className="text-white">Live reveal</strong> — watch the {JERSEY_LAUNCH_YEAR} jersey debut with the
                    Starks community.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-0.5 font-bold text-amber-300">→</span>
                  <span>
                    <strong className="text-white">Hosted vibe</strong> — gathering anchored at{" "}
                    {JERSEY_LAUNCH_VENUE} in {JERSEY_LAUNCH_LOCATION}.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-0.5 font-bold text-amber-300">→</span>
                  <span>
                    <strong className="text-white">One tap</strong> — use the Facebook event for reminders, updates, and the
                    live stream.
                  </span>
                </li>
              </ul>
              {facebookEventUrl ? (
                <p className="mt-6 text-xs text-indigo-200/80">
                  Opens Facebook in a new tab. Log in to RSVP or get notified when we go live.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
