"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Gift,
  ImageIcon,
  Instagram,
  MapPin,
  MessageCircle,
  PhoneCall,
  PlayCircle,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";

import { listenCollection, BirthdayWishDoc, EventDoc, LinkDoc, PostDoc, setRsvp } from "@/lib/firestore";
import { useAuth } from "@/lib/AuthContext";
import { db, isFirebaseConfigured } from "@/lib/firebaseClient";

import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import PostCard from "@/components/feed/PostCard";
import LandingCarousel from "@/components/landing/LandingCarousel";
import { AuthModal, AuthModalTrigger } from "@/app/components/AuthModal";
import type { KeyMomentYearGroup } from "@/lib/localKeyMoments";
import { trackPartnerClick } from "@/lib/analytics/partnerEvents";
import { fixtureDate } from "@/lib/fixtures";
import { subscribeToPublicFixtures, type Fixture, type FixtureResultOutcome } from "@/lib/firebase/fixturesService";

const HOMEPAGE_PARTNER_SPOTLIGHT = "Hashtag India";
const DEFAULT_MEGASMASH_YOUTUBE_URL = "https://www.youtube.com/@starkscricket";
const CURRENT_MEMORIES_YEAR = "2026";

function formatFixtureDateLabel(fixture: Fixture): string {
  const date = fixtureDate(fixture.date);
  if (!date) return "Date & time TBD";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const MEGA_SMASH_RESULT_STYLES: Record<
  FixtureResultOutcome,
  {
    chipClassName: string;
    cardClassName: string;
    label: string;
  }
> = {
  win: {
    chipClassName: "border-emerald-300/80 bg-emerald-200/70 text-emerald-900",
    cardClassName: "border-emerald-200/80 bg-emerald-100/35",
    label: "Win",
  },
  loss: {
    chipClassName: "border-rose-300/80 bg-rose-200/70 text-rose-900",
    cardClassName: "border-rose-200/80 bg-rose-100/35",
    label: "Loss",
  },
  tie: {
    chipClassName: "border-amber-300/80 bg-amber-200/70 text-amber-900",
    cardClassName: "border-amber-200/80 bg-amber-100/35",
    label: "Tie",
  },
  unknown: {
    chipClassName: "border-blue-300/80 bg-blue-200/70 text-blue-900",
    cardClassName: "border-blue-200/80 bg-blue-100/35",
    label: "Upcoming",
  },
};

function QrWelcomeBanner() {
  const searchParams = useSearchParams();
  const fromQr = searchParams?.get("source") === "qr";
  if (!fromQr) return null;
  return (
    <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
      Welcome! Please{" "}
      <a className="underline font-semibold" href="/register">
        register
      </a>{" "}
      or{" "}
      <a className="underline font-semibold" href="/login">
        login
      </a>{" "}
      to join the Starks community.
    </div>
  );
}

function getTodayDisplayDateKey() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const partValue = (type: "year" | "month" | "day") => parts.find((part) => part.type === type)?.value ?? "00";
  return `${partValue("year")}-${partValue("month")}-${partValue("day")}`;
}

type LandingPageProps = {
  keyMomentYears?: KeyMomentYearGroup[];
};

export default function LandingPage({
  keyMomentYears = [],
}: LandingPageProps) {
  const { currentUser } = useAuth();
  const user = currentUser?.authUser ?? null;
  const userDoc = currentUser?.userDoc ?? null;
  const isApproved = userDoc?.status === "approved" || userDoc?.status === "active";
  const isAdmin = userDoc?.role === "admin";
  const [authGateOpen, setAuthGateOpen] = useState(false);
  const [authTrigger, setAuthTrigger] = useState<AuthModalTrigger>("general");

  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [events, setEvents] = useState<Array<{ id: string; data: EventDoc }>>([]);
  const [links, setLinks] = useState<Array<{ id: string; data: LinkDoc }>>([]);
  const [posts, setPosts] = useState<Array<{ id: string; data: PostDoc }>>([]);
  const [birthdayWishes, setBirthdayWishes] = useState<Array<{ id: string; data: BirthdayWishDoc }>>([]);
  const todayDisplayDateKey = getTodayDisplayDateKey();
  const currentWishYear = Number(todayDisplayDateKey.slice(0, 4));
  const [nowTimestamp] = useState(() => Date.now());

  const todayBirthdayWishes = birthdayWishes
    .filter(({ data }) => data.wishType === "birthday" && data.displayDateKey === todayDisplayDateKey)
    .slice(0, 6);

  const belatedBirthdayWishes = birthdayWishes
    .filter(({ data }) => data.wishType === "belated" && data.wishYear === currentWishYear)
    .slice(0, 6);

  const memoryYears = useMemo(() => {
    const years = new Set(keyMomentYears.map((group) => group.year));
    years.add(CURRENT_MEMORIES_YEAR);
    return [...years].sort((a, b) => Number(b) - Number(a));
  }, [keyMomentYears]);
  const [selectedMemoriesYear, setSelectedMemoriesYear] = useState<string>(() =>
    keyMomentYears.find((group) => Number(group.year) === 2026)?.year ?? CURRENT_MEMORIES_YEAR,
  );
  const selectedMemoriesGroup = useMemo(
    () => keyMomentYears.find((group) => group.year === selectedMemoriesYear) ?? null,
    [keyMomentYears, selectedMemoriesYear],
  );
  const selectedMemoriesImages = selectedMemoriesGroup?.images.slice(0, 4) ?? [];
  const [memoriesCarouselIndex, setMemoriesCarouselIndex] = useState(0);

  useEffect(() => {
    const stillExists = memoryYears.includes(selectedMemoriesYear);
    if (stillExists) return;
    const fallbackYear = memoryYears.find((year) => year === CURRENT_MEMORIES_YEAR) ?? memoryYears[0] ?? "";
    setSelectedMemoriesYear(fallbackYear);
  }, [memoryYears, selectedMemoriesYear]);

  useEffect(() => {
    setMemoriesCarouselIndex(0);
  }, [selectedMemoriesYear]);

  useEffect(() => {
    if (selectedMemoriesImages.length <= 1) return;
    const intervalId = window.setInterval(() => {
      setMemoriesCarouselIndex((current) => (current + 1) % selectedMemoriesImages.length);
    }, 4500);
    return () => window.clearInterval(intervalId);
  }, [selectedMemoriesImages.length, selectedMemoriesYear]);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    return listenCollection<EventDoc>("events", setEvents, {
      orderByField: "dateTime",
      direction: "asc",
      limit: 10,
    });
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    return listenCollection<LinkDoc>("links", setLinks, { limit: 10 });
  }, []);
  useEffect(() => {
    return subscribeToPublicFixtures(
      (incoming) => {
        setFixtures(incoming.filter((fixture) => fixture.seasonKey === "mega-smash-2026" && fixture.seasonYear === 2026));
      },
      {
        onError: () => {
          setFixtures([]);
        },
      },
    );
  }, []);
  useEffect(() => {
    if (!isFirebaseConfigured) return;
    // Public landing: fetch latest posts (reads are public per Firestore rules).
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(10));
    return onSnapshot(
      q,
      (snap) => setPosts(snap.docs.map((d) => ({ id: d.id, data: d.data() as PostDoc }))),
      (err) => {
        console.warn("[LandingPage] posts listener error", err);
        setPosts([]);
      }
    );
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    return listenCollection<BirthdayWishDoc>("birthdayWishes", setBirthdayWishes, {
      orderByField: "postedAt",
      direction: "desc",
      limit: 24,
    });
  }, []);

  const upcomingEvents = useMemo(() => {
    const toEventDate = (event: EventDoc): Date | null => {
      const eventWithOptionalDate = event as EventDoc & { date?: unknown; dateTime?: unknown };
      const raw = eventWithOptionalDate.dateTime ?? eventWithOptionalDate.date;
      if (!raw) return null;
      const rawObject = raw as { toDate?: unknown };
      if (typeof raw === "object" && raw !== null && typeof rawObject.toDate === "function") {
        return rawObject.toDate();
      }
      const d = new Date(raw);
      return Number.isNaN(d.getTime()) ? null : d;
    };

    return events
      .filter(({ data }) => {
        const d = toEventDate(data);
        return Boolean(d && d.getTime() >= nowTimestamp);
      })
      .sort((a, b) => {
        const ad = toEventDate(a.data)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        const bd = toEventDate(b.data)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        return ad - bd;
      });
  }, [events, nowTimestamp]);

  const megaSmashFixtures = useMemo(
    () =>
      [...fixtures]
        .sort((a, b) => {
          const aTime = fixtureDate(a.date)?.getTime() ?? Number.MAX_SAFE_INTEGER;
          const bTime = fixtureDate(b.date)?.getTime() ?? Number.MAX_SAFE_INTEGER;
          if (aTime !== bTime) return aTime - bTime;
          return a.gameNumber - b.gameNumber;
        })
        .slice(0, 12),
    [fixtures],
  );

  const megaSmashYoutubeUrl =
    megaSmashFixtures.find((fixture) => fixture.youtubeUrl)?.youtubeUrl || DEFAULT_MEGASMASH_YOUTUBE_URL;

  return (
    <div className="space-y-10">
      <Suspense fallback={null}>
        <QrWelcomeBanner />
      </Suspense>

      {/* Hero */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center py-6 lg:py-10">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-100/70 border border-blue-200 px-4 py-2 text-sm font-semibold text-brand-deep">
            Building Communities Through Cricket
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-950">
            Empowering Cricketers,
            <br />
            Strengthening Communities
          </h1>

          <p className="text-slate-600 text-lg leading-relaxed max-w-xl">
            Join Starks Cricket Club, partnered with non-profit organizations to create positive change through cricket,
            teamwork, and community engagement since 2018.
          </p>

          {/* Updated CTA buttons */}
          <div className="flex flex-wrap gap-3">
            <a href="/community">
              <Button variant="dark" className="px-6 py-3 rounded-2xl">
                Explore Community
              </Button>
            </a>
            <a href="/register">
              <Button variant="outline" className="px-6 py-3 rounded-2xl">
                Join as Member
              </Button>
            </a>
          </div>

          {!isFirebaseConfigured && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 max-w-xl">
              Firebase env vars aren’t set yet, so Events/Links/Posts won’t load. Add{" "}
              <code>NEXT_PUBLIC_FIREBASE_*</code> to <code>.env.local</code>.
            </div>
          )}
        </div>

        <div className="relative">
          <LandingCarousel />
        </div>
      </section>

      {/* About */}
      <section id="about" className="px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <div>
              <div className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
                About Starks Cricket
              </div>
              <h2 className="mt-4 text-3xl md:text-4xl font-extrabold tracking-tight text-slate-950">
                A regional cricket club for the Triangle, NC — Estd. 2018
              </h2>
              <p className="mt-4 text-lg text-slate-600 leading-relaxed">
                Starks Cricket is a community-first club based in the Triangle area of North Carolina. We bring together
                professionals, students, and families who love the game — and we’re just as serious about{" "}
                <span className="font-semibold text-slate-800">wellbeing</span> and{" "}
                <span className="font-semibold text-slate-800">work–life balance</span> as we are about performance.
              </p>
              <p className="mt-4 text-slate-600 leading-relaxed">
                Our mission is simple: create a welcoming environment where people can stay active, build friendships,
                and grow through sport — whether you’re picking up a bat for the first time or competing regularly.
              </p>
            </div>

            <Card>
              <CardHeader>
                <div className="font-extrabold text-slate-950">What makes Starks different</div>
                <div className="mt-1 text-sm text-slate-600">A few things members consistently highlight.</div>
              </CardHeader>
              <CardBody>
                <ul className="grid gap-3 text-slate-700">
                  <li>
                    <span className="font-semibold text-slate-900">Balanced cricket culture</span> — competitive spirit,
                    supportive vibes.
                  </li>
                  <li>
                    <span className="font-semibold text-slate-900">Community & connection</span> — meet people across the
                    Triangle through shared practice and events.
                  </li>
                  <li>
                    <span className="font-semibold text-slate-900">Healthy routines</span> — training that fits real
                    schedules and promotes long-term wellbeing.
                  </li>
                  <li>
                    <span className="font-semibold text-slate-900">Partnership-minded</span> — we collaborate with local
                    organizations to create positive impact.
                  </li>
                </ul>

                <div className="mt-6 flex flex-wrap gap-3">
                  <a href="/register">
                    <Button variant="dark" className="px-6 py-3 rounded-2xl">
                      Join the Club
                    </Button>
                  </a>
                  <a href="/partners">
                    <Button variant="outline" className="px-6 py-3 rounded-2xl">
                      Meet Our Partners
                    </Button>
                  </a>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      </section>

      <section className="px-4 py-12">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800">
                MegaBash-2026 Completed
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-950">
                MegaSmash-2026 · 12 games schedule released
              </h2>
              <p className="max-w-3xl text-lg text-slate-600">
                Mega Bash is done. Mega Smash is now live with all 12 fixtures listed below, each card ready for YouTube recap
                links, MVP photo updates, and win/loss/tie tracking.
              </p>
            </div>
            <a href={megaSmashYoutubeUrl} target="_blank" rel="noreferrer">
              <Button variant="dark" className="rounded-2xl px-6 py-3">
                <PlayCircle className="size-4" />
                Watch on YouTube
              </Button>
            </a>
          </div>

          <Card className="rounded-[28px] border-blue-200 bg-gradient-to-r from-blue-50 via-white to-indigo-50 shadow-none">
            <CardBody>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">Exclusive Season Sponsor</p>
                  <h3 className="text-2xl font-black text-slate-900">{HOMEPAGE_PARTNER_SPOTLIGHT} · Season 2026</h3>
                  <p className="text-sm text-slate-600">
                    Proud exclusive sponsor for MegaSmash-2026. Support our partner while supporting Starks.
                  </p>
                </div>
                <a href="/partners" className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <Image
                    src="/partners/hashtag-india-optimized.png"
                    alt="Hashtag India"
                    width={120}
                    height={48}
                    className="h-10 w-auto object-contain"
                  />
                  <span className="text-sm font-semibold text-slate-800">View Partner</span>
                </a>
              </div>
            </CardBody>
          </Card>

          <div className="relative overflow-hidden rounded-[28px] border border-white/60 bg-gradient-to-br from-slate-100/80 via-white/70 to-blue-100/70 p-2 shadow-[0_18px_50px_rgba(15,23,42,0.1)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(255,255,255,0.85),transparent_45%),radial-gradient(circle_at_85%_15%,rgba(191,219,254,0.55),transparent_35%)]" />
            <div className="relative overflow-x-auto pb-2 scroll-smooth">
            <div className="flex min-w-full snap-x snap-mandatory gap-4 px-1">
              {megaSmashFixtures.map((fixture) => {
                const resultStyle = MEGA_SMASH_RESULT_STYLES[fixture.resultOutcome];
                return (
                  <article
                    key={fixture.id}
                    className={`w-[86vw] max-w-[340px] shrink-0 snap-start rounded-[24px] border p-4 shadow-[0_10px_34px_rgba(15,23,42,0.12)] backdrop-blur-xl md:w-[320px] ${resultStyle.cardClassName}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">MegaSmash-2026</p>
                        <h3 className="mt-1 text-xl font-black text-slate-900">
                          Game {String(fixture.gameNumber).padStart(2, "0")}
                        </h3>
                        <p className="mt-1 text-sm font-semibold text-slate-700">Starks vs {fixture.opponent}</p>
                      </div>
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] ${resultStyle.chipClassName}`}
                      >
                        {resultStyle.label}
                      </span>
                    </div>

                    <div className="mt-4 space-y-1 text-sm text-slate-700">
                      <p>{formatFixtureDateLabel(fixture)}</p>
                      <p>{fixture.venue || "Venue TBD"}</p>
                      <p>{fixture.location || "Location TBD"}</p>
                    </div>

                    <div className="mt-4 rounded-2xl border border-white/80 bg-white/60 p-3 backdrop-blur">
                      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-600">Result</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {fixture.resultText || "Schedule released"}
                      </p>
                    </div>

                    <div className="mt-3 rounded-2xl border border-white/80 bg-white/65 p-3 backdrop-blur">
                      <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-slate-600">
                        <Star className="size-3.5 text-violet-700" />
                        MVP Update
                      </p>
                      <div className="mt-2 flex items-center gap-3">
                        <div className="relative size-12 overflow-hidden rounded-full border border-slate-200">
                          {fixture.mvpImageUrl ? (
                            <Image
                              src={fixture.mvpImageUrl}
                              alt={`${fixture.mvp || "Starks player"} MVP`}
                              fill
                              sizes="48px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-slate-100 text-xs font-bold text-slate-500">
                              MVP
                            </div>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-slate-900">{fixture.mvp || "TBD after match"}</p>
                      </div>
                    </div>

                    <a href={fixture.youtubeUrl || DEFAULT_MEGASMASH_YOUTUBE_URL} target="_blank" rel="noreferrer" className="mt-4 block">
                      <Button variant="outline" className="w-full">
                        <PlayCircle className="size-4" />
                        YouTube Link
                      </Button>
                    </a>
                  </article>
                );
              })}
            </div>
            </div>
            {megaSmashFixtures.length === 0 ? (
              <div className="mt-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                Publish MegaSmash-2026 fixtures from Admin to display the 12-game carousel.
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {memoryYears.length > 0 && (
        <section className="bg-white py-12 md:py-16">
          <div className="max-w-6xl mx-auto px-4 space-y-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="space-y-3">
                <div className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
                  Key Memories Since 2018
                </div>
                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-950">
                  Explore Starks memories by year
                </h2>
                <p className="max-w-3xl text-lg text-slate-600">
                  Select a year to view that season&apos;s key moments, from our 2018 beginnings to today.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {memoryYears.map((year) => (
                    <button
                      key={year}
                      type="button"
                      onClick={() => setSelectedMemoriesYear(year)}
                      className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                        selectedMemoriesYear === year
                          ? "border-blue-300 bg-blue-600 text-white shadow-sm"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-blue-50"
                      }`}
                    >
                      {year}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <a href="/gallery">
                  <Button variant="dark" className="rounded-2xl px-6 py-3">
                    <ImageIcon className="size-4" />
                    View All Key Moments
                  </Button>
                </a>
                <a
                  href="https://www.instagram.com/starkscricketclub?igsh=MmU3emNlMmpjNHR0&utm_source=qr"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" className="rounded-2xl px-6 py-3">
                    <Instagram className="size-4" />
                    Full Photo Feed
                  </Button>
                </a>
              </div>
            </div>

            {selectedMemoriesImages.length > 0 ? (
              <div className="space-y-4">
                <div className="relative overflow-hidden rounded-[28px] bg-slate-900 shadow-xl">
                  <div
                    className="flex transition-transform duration-500 ease-out"
                    style={{ transform: `translateX(-${memoriesCarouselIndex * 100}%)` }}
                  >
                    {selectedMemoriesImages.map((image, imageIndex) => (
                      <a key={image.id} href="/gallery" className="group relative block w-full shrink-0 text-left">
                        <div className="relative aspect-[16/10] w-full">
                          <Image
                            src={image.src}
                            alt={image.title}
                            fill
                            sizes="(max-width: 1024px) 100vw, 80vw"
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/75">
                            {selectedMemoriesYear} Memory {String(imageIndex + 1).padStart(2, "0")}
                          </p>
                          <h3 className="mt-2 text-2xl font-black">{image.title}</h3>
                          <p className="mt-2 max-w-2xl text-sm text-white/85">{image.caption}</p>
                        </div>
                      </a>
                    ))}
                  </div>

                  {selectedMemoriesImages.length > 1 ? (
                    <>
                      <button
                        type="button"
                        aria-label="Previous memory image"
                        onClick={() =>
                          setMemoriesCarouselIndex((current) =>
                            current === 0 ? selectedMemoriesImages.length - 1 : current - 1,
                          )
                        }
                        className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/35 bg-black/35 p-2 text-white backdrop-blur hover:bg-black/50"
                      >
                        <ChevronLeft className="size-5" />
                      </button>
                      <button
                        type="button"
                        aria-label="Next memory image"
                        onClick={() =>
                          setMemoriesCarouselIndex((current) => (current + 1) % selectedMemoriesImages.length)
                        }
                        className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/35 bg-black/35 p-2 text-white backdrop-blur hover:bg-black/50"
                      >
                        <ChevronRight className="size-5" />
                      </button>
                    </>
                  ) : null}
                </div>

                {selectedMemoriesImages.length > 1 ? (
                  <div className="flex justify-center gap-2">
                    {selectedMemoriesImages.map((image, imageIndex) => (
                      <button
                        key={image.id}
                        type="button"
                        aria-label={`Go to memory image ${imageIndex + 1}`}
                        onClick={() => setMemoriesCarouselIndex(imageIndex)}
                        className={`h-2.5 w-2.5 rounded-full transition ${
                          imageIndex === memoriesCarouselIndex ? "bg-blue-600" : "bg-slate-300 hover:bg-slate-400"
                        }`}
                      />
                    ))}
                  </div>
                ) : null}

                <Card className="rounded-[24px] border-blue-100 bg-blue-50 shadow-none">
                  <CardBody>
                    <div className="space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">Yearly Archive</p>
                      <h3 className="text-xl font-black text-slate-900">{selectedMemoriesYear} moments on site</h3>
                      <p className="text-sm text-slate-600">
                        Carousel rotates automatically and supports manual left/right navigation on mobile and desktop.
                      </p>
                    </div>
                  </CardBody>
                </Card>
              </div>
            ) : (
              <Card className="rounded-[28px] border border-dashed border-blue-200 bg-blue-50/60 shadow-none">
                <CardBody>
                  <div className="space-y-2 p-2 text-center sm:text-left">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
                      {selectedMemoriesYear} Memories So Far
                    </p>
                    <h3 className="text-2xl font-black text-slate-900">Moments for {selectedMemoriesYear} are coming in</h3>
                    <p className="text-sm text-slate-600">
                      We have added {selectedMemoriesYear} to the archive selector. Upload key moment photos for this year
                      to display them here.
                    </p>
                  </div>
                </CardBody>
              </Card>
            )}
          </div>
        </section>
      )}

      {(todayBirthdayWishes.length > 0 || belatedBirthdayWishes.length > 0 || isAdmin) && (
        <section>
          <div className="overflow-hidden rounded-[28px] border border-pink-200 bg-gradient-to-r from-pink-50 via-rose-50 to-amber-50 shadow-[0_12px_36px_rgba(244,114,182,0.12)]">
            <div className="p-5 sm:p-6 lg:p-8">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-pink-200 bg-white/80 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.16em] text-pink-700">
                  <Gift className="size-4" />
                  Birthday Wishes
                </div>
                <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
                  Celebrating our Starks members
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
                  Same-day wishes appear automatically on birthdays, and belated wishes help us catch members whose
                  birthdays already passed before they added their details this year.
                </p>
              </div>

              <div className="mt-6 grid gap-4 xl:grid-cols-2">
                {todayBirthdayWishes.length > 0 && (
                  <div className="rounded-[24px] border border-white/80 bg-white/75 p-4 shadow-sm backdrop-blur sm:p-5">
                    <div className="text-sm font-extrabold uppercase tracking-[0.14em] text-pink-700">
                      Today&apos;s Birthday Wishes
                    </div>
                    <div className="mt-4 grid gap-3">
                      {todayBirthdayWishes.map(({ id, data }) => (
                        <div key={id} className="rounded-2xl border border-white/80 bg-white/90 px-4 py-4 shadow-sm backdrop-blur">
                          <div className="text-base font-bold text-slate-950">
                            {data.message} <span aria-hidden="true">🎂</span>
                          </div>
                          <div className="mt-1 text-sm text-slate-600">
                            Wishing {data.firstName} a fantastic day from the Starks community.
                          </div>
                        </div>
                      ))}
                      {todayBirthdayWishes.length === 0 && (
                        <div className="rounded-2xl border border-dashed border-pink-200 bg-white/90 px-4 py-4 text-sm text-slate-600">
                          {isAdmin
                            ? "No same-day birthday wishes are active right now. They will appear here automatically on members' birthdays."
                            : "No same-day birthday wishes are active right now."}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {(belatedBirthdayWishes.length > 0 || isAdmin) && (
                  <div className="rounded-[24px] border border-amber-200 bg-amber-50/80 p-4 shadow-sm sm:p-5">
                    <div className="text-sm font-extrabold uppercase tracking-[0.14em] text-amber-700">
                      Belated Birthday Wishes
                    </div>
                    <div className="mt-2 text-sm leading-6 text-slate-600">
                      A one-time catch-up for members whose birthdays already happened this year before they added or
                      updated their birthday details.
                    </div>
                    <div className="mt-4 grid gap-3">
                      {belatedBirthdayWishes.map(({ id, data }) => (
                        <div key={id} className="rounded-2xl border border-amber-200 bg-white px-4 py-4 shadow-sm">
                          <div className="text-base font-bold text-slate-950">
                            {data.message} <span aria-hidden="true">🎉</span>
                          </div>
                          <div className="mt-1 text-sm text-slate-600">
                            Catching up with {data.firstName} and sending warm wishes from the Starks community.
                          </div>
                        </div>
                      ))}
                      {belatedBirthdayWishes.length === 0 && (
                        <div className="rounded-2xl border border-dashed border-amber-200 bg-white px-4 py-4 text-sm text-slate-600">
                          {isAdmin
                            ? "No belated birthday catch-up wishes are active right now. Members with past birthdays this year will appear here after their details are saved."
                            : "No belated birthday wishes are active right now."}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Community Preview Section */}
      <section className="px-4 py-10">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-950 mb-3">See What&apos;s Happening</h2>
          <p className="text-lg text-slate-600 mb-6">
            Browse our community feed, discover events, and connect with fellow cricket enthusiasts.
          </p>
          <a href="/community">
            <Button variant="dark">Explore Community Feed</Button>
          </a>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardBody>
              <div className="text-center p-2">
                <div className="size-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="size-6 text-blue-600" />
                </div>
                <h3 className="font-semibold mb-2">Community Posts</h3>
                <p className="text-sm text-slate-600">Read stories, achievements, and updates from members</p>
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div className="text-center p-2">
                <div className="size-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="size-6 text-green-600" />
                </div>
                <h3 className="font-semibold mb-2">Upcoming Events</h3>
                <p className="text-sm text-slate-600">Discover tournaments, training sessions, and social gatherings</p>
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div className="text-center p-2">
                <div className="size-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="size-6 text-purple-600" />
                </div>
                <h3 className="font-semibold mb-2">Meet Members</h3>
                <p className="text-sm text-slate-600">Connect with athletes, coaches, and cricket enthusiasts</p>
              </div>
            </CardBody>
          </Card>
        </div>
      </section>

      {/* Community CTA (updated buttons) */}
      <section id="community" className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen bg-white pb-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="rounded-[32px] border border-slate-200 bg-[#1F3B8D] text-white px-8 py-14 md:px-14 md:py-20 shadow-sm">
            <div className="mx-auto max-w-3xl text-center">
              <h3 className="text-4xl md:text-5xl font-extrabold tracking-tight">Ready to Join Our Community?</h3>
              <p className="mt-5 text-lg md:text-xl text-white/90 leading-relaxed">
                Be part of something bigger. Connect with athletes, share your journey, and make an impact.
              </p>

              <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
                <a href="/community">
                  <Button
                    variant="outline"
                    className="bg-white text-slate-950 border-white/20 hover:bg-white/90 px-7 py-3 rounded-2xl"
                  >
                    Explore Community
                  </Button>
                </a>
                <a href="/register">
                  <Button
                    variant="outline"
                    className="bg-white text-slate-950 border-white/20 hover:bg-white/90 px-7 py-3 rounded-2xl"
                  >
                    Join Now
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Partners Section - Enhanced with Real Data */}
      <section className="px-4 py-12 md:py-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8 md:mb-10">
            <h2 className="text-2xl md:text-4xl font-extrabold text-slate-950 mb-3 md:mb-4">Our Partners</h2>
            <p className="text-base md:text-xl text-slate-600 max-w-2xl mx-auto">
              We&apos;re proud to partner with organizations that share our commitment to building stronger communities
              through cricket.
            </p>
          </div>

          <div className="relative mb-8">
            <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-fuchsia-400/30 via-blue-400/30 to-cyan-400/30 blur-lg md:blur-xl" />
            <div className="relative rounded-3xl border border-blue-200 bg-gradient-to-r from-blue-50 via-white to-indigo-50 px-4 py-4 sm:px-6 sm:py-5 md:px-8 md:py-6 shadow-lg">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 md:gap-6">
                <div className="flex items-center gap-3 md:gap-4">
                  <a
                    href="/partners"
                    className="group shrink-0 rounded-2xl border border-slate-200 bg-white p-2.5 md:p-3 shadow-sm hover:shadow-md transition"
                    title="Learn more about Hashtag India"
                    onClick={() =>
                      trackPartnerClick({
                        section: "homepage_our_partners",
                        linkType: "spotlight_logo",
                        partnerName: HOMEPAGE_PARTNER_SPOTLIGHT,
                        destination: "/partners",
                      })
                    }
                  >
                    <Image
                      src="/partners/hashtag-india-optimized.png"
                      alt="Hashtag India"
                      width={144}
                      height={56}
                      className="h-12 w-28 object-contain group-hover:scale-[1.03] transition sm:h-14 sm:w-36"
                    />
                  </a>
                  <div className="min-w-0">
                    <div className="inline-flex items-center gap-1.5 md:gap-2 rounded-full bg-white/80 border border-blue-200 px-2.5 md:px-3 py-1 text-[10px] md:text-xs font-bold text-blue-700 uppercase tracking-wide">
                      <Sparkles className="size-3 md:size-3.5" />
                      2026 Sponsor Spotlight
                    </div>
                    <div className="mt-1.5 md:mt-2 text-xl md:text-2xl font-extrabold text-slate-900 leading-tight">
                      Hashtag India
                    </div>
                    <div className="mt-1 text-xs sm:text-sm md:text-base text-slate-700">
                      Proud partner of Starks Cricket
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap gap-2.5 md:gap-3 w-full lg:w-auto">
                  <div className="inline-flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
                    <MapPin className="size-4 text-blue-600" />
                    Cary, NC
                  </div>
                  <a
                    href="https://www.instagram.com/hashtagindia_cary_nc?igsh=MWI1em95NTFkMzVkbg=="
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 text-white px-4 py-2.5 text-sm font-bold hover:opacity-95 transition min-h-11"
                    title="Visit Instagram"
                    onClick={() =>
                      trackPartnerClick({
                        section: "homepage_our_partners",
                        linkType: "instagram",
                        partnerName: HOMEPAGE_PARTNER_SPOTLIGHT,
                        destination: "https://www.instagram.com/hashtagindia_cary_nc",
                      })
                    }
                  >
                    Instagram
                  </a>
                  <a
                    href="/partners"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-white border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-800 hover:bg-slate-50 transition min-h-11"
                    title="Learn more"
                    onClick={() =>
                      trackPartnerClick({
                        section: "homepage_our_partners",
                        linkType: "learn_more",
                        partnerName: HOMEPAGE_PARTNER_SPOTLIGHT,
                        destination: "/partners",
                      })
                    }
                  >
                    Learn More
                  </a>
                  <a
                    href="tel:+19196501140"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 text-white px-4 py-2.5 text-sm font-bold hover:bg-slate-800 transition min-h-11"
                    title="Call Hashtag India"
                    onClick={() =>
                      trackPartnerClick({
                        section: "homepage_our_partners",
                        linkType: "phone",
                        partnerName: HOMEPAGE_PARTNER_SPOTLIGHT,
                        destination: "tel:+19196501140",
                      })
                    }
                  >
                    <PhoneCall className="size-4" />
                    (919) 650-1140
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center">
            <a
              href="/partners"
              onClick={() =>
                trackPartnerClick({
                  section: "homepage_our_partners",
                  linkType: "view_all",
                  destination: "/partners",
                })
              }
            >
              <Button variant="outline">View All Partners</Button>
            </a>
          </div>
        </div>
      </section>

      {/* Keep existing landing sections below (events/links/posts) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div id="events" className="lg:col-span-2">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-bold">Upcoming Events</h2>
              <p className="text-sm text-slate-600 mt-1">Matches, practices, community meetups, and announcements.</p>
            </CardHeader>
            <CardBody>
              {upcomingEvents.length === 0 && (
                <p className="text-slate-600">{isFirebaseConfigured ? "No events yet." : "Connect Firebase to load events."}</p>
              )}
              <div className="grid gap-4">
                {upcomingEvents.map(({ id, data }) => (
                  <div key={id} className="rounded-2xl border border-slate-200 bg-white p-4 hover:shadow-sm transition">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold">{data.title}</div>
                        <div className="text-sm text-slate-600 mt-1">
                          {new Date(data.dateTime).toLocaleString()} · {data.location}
                        </div>
                      </div>
                    </div>

                    {data.description && <p className="text-sm text-slate-700 mt-3 leading-relaxed">{data.description}</p>}

                    <div className="mt-4 flex flex-wrap gap-2">
                      {isApproved && user ? (
                        <>
                          <Button
                            onClick={() => isFirebaseConfigured && setRsvp(id, user.uid, "going")}
                            disabled={!isFirebaseConfigured}
                          >
                            Going
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => isFirebaseConfigured && setRsvp(id, user.uid, "interested")}
                            disabled={!isFirebaseConfigured}
                          >
                            Interested
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          onClick={() => {
                            setAuthTrigger("event");
                            setAuthGateOpen(true);
                          }}
                        >
                          Sign in to RSVP
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-bold">Quick Links</h2>
              <p className="text-sm text-slate-600 mt-1">Resources and social channels.</p>
            </CardHeader>
            <CardBody>
              {links.length === 0 ? (
                <p className="text-slate-600">{isFirebaseConfigured ? "No links yet." : "Connect Firebase to load links."}</p>
              ) : (
                <div className="grid gap-2">
                  {links.map(({ id, data }) => (
                    <a key={id} href={data.url} className="text-sm font-semibold text-blue-700 hover:underline" target="_blank" rel="noreferrer">
                      {data.title}
                    </a>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold tracking-tight text-slate-950">Latest Posts</h2>
          <a href="/community">
            <Button variant="outline">Explore Feed</Button>
          </a>
        </div>
        <div className="grid gap-6">
          {posts.map(({ id, data }) => (
            <PostCard
              key={id}
              postId={id}
              post={data}
              uid={user?.uid}
              canInteract={Boolean(userDoc?.status === "approved" && isFirebaseConfigured)}
              isAdmin={userDoc?.role === "admin"}
            />
          ))}
        </div>
      </section>

      <AuthModal open={authGateOpen} onOpenChange={setAuthGateOpen} trigger={authTrigger} />
    </div>
  );
}

// Partner tile grid intentionally removed to avoid repeating spotlight content.

