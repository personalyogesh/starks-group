"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Award, Calendar, MessageCircle, Users } from "lucide-react";
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";

import { listenCollection, EventDoc, LinkDoc, PostDoc, setRsvp } from "@/lib/firestore";
import { useAuth } from "@/lib/AuthContext";
import { db, isFirebaseConfigured } from "@/lib/firebaseClient";

import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import PostCard from "@/components/feed/PostCard";
import LandingCarousel from "@/components/landing/LandingCarousel";
import { AuthModal, AuthModalTrigger } from "@/app/components/AuthModal";
import { getFeaturedPartners, Partner } from "@/lib/firebase/partnersService";

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

export default function LandingPage() {
  const { currentUser } = useAuth();
  const user = currentUser?.authUser ?? null;
  const userDoc = currentUser?.userDoc ?? null;
  const isApproved = userDoc?.status === "approved" || userDoc?.status === "active";
  const [authGateOpen, setAuthGateOpen] = useState(false);
  const [authTrigger, setAuthTrigger] = useState<AuthModalTrigger>("general");

  const [events, setEvents] = useState<Array<{ id: string; data: EventDoc }>>([]);
  const [links, setLinks] = useState<Array<{ id: string; data: LinkDoc }>>([]);
  const [posts, setPosts] = useState<Array<{ id: string; data: PostDoc }>>([]);
  const [featuredPartners, setFeaturedPartners] = useState<Partner[]>([]);

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
    let cancelled = false;
    (async () => {
      if (!isFirebaseConfigured) return;
      try {
        const rows = await getFeaturedPartners();
        if (!cancelled) setFeaturedPartners(rows.slice(0, 6));
      } catch {
        // ignore (partners are optional content)
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
            <a href="/dashboard">
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

      {/* Community Preview Section */}
      <section className="px-4 py-10">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-950 mb-3">See What&apos;s Happening</h2>
          <p className="text-lg text-slate-600 mb-6">
            Browse our community feed, discover events, and connect with fellow cricket enthusiasts.
          </p>
          <a href="/dashboard">
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
                <a href="/dashboard">
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
      <section className="px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-950 mb-4">Our Partners</h2>
            <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto">
              We&apos;re proud to partner with organizations that share our commitment to building stronger communities
              through cricket.
            </p>
          </div>

          {featuredPartners.length > 0 ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8">
                {featuredPartners.slice(0, 8).map((partner) => (
                  <a
                    key={partner.id}
                    href="/partners"
                    className="group rounded-2xl border border-slate-200 bg-white p-6 flex items-center justify-center hover:shadow-lg transition-all cursor-pointer"
                    title={partner.name}
                  >
                    {partner.logoUrl ? (
                      <div className="relative h-16 w-full">
                        <Image
                          src={partner.logoUrl}
                          alt={partner.name}
                          fill
                          className="object-contain grayscale group-hover:grayscale-0 transition-all"
                        />
                      </div>
                    ) : (
                      <Award className="size-10 text-slate-300" />
                    )}
                  </a>
                ))}
              </div>

              <div className="text-center">
                <a href="/partners">
                  <Button variant="outline">View All Partners</Button>
                </a>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="rounded-2xl border border-slate-200 bg-slate-50 p-10 flex items-center justify-center">
                  <Award className="size-10 text-slate-300" />
                </div>
              ))}
            </div>
          )}
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
              {events.length === 0 && (
                <p className="text-slate-600">{isFirebaseConfigured ? "No events yet." : "Connect Firebase to load events."}</p>
              )}
              <div className="grid gap-4">
                {events.map(({ id, data }) => (
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
          <a href="/dashboard">
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

