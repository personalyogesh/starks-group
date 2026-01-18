"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Calendar, MessageCircle, Users } from "lucide-react";

import { listenCollection, EventDoc, LinkDoc, PostDoc, setRsvp } from "@/lib/firestore";
import { useAuth } from "@/lib/AuthContext";
import { isFirebaseConfigured } from "@/lib/firebaseClient";

import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import PostCard from "@/components/feed/PostCard";
import LandingCarousel from "@/components/landing/LandingCarousel";
import { AuthModal, AuthModalTrigger } from "@/app/components/AuthModal";

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
  const isApproved = userDoc?.status === "approved";
  const [authGateOpen, setAuthGateOpen] = useState(false);
  const [authTrigger, setAuthTrigger] = useState<AuthModalTrigger>("general");

  const [events, setEvents] = useState<Array<{ id: string; data: EventDoc }>>([]);
  const [links, setLinks] = useState<Array<{ id: string; data: LinkDoc }>>([]);
  const [posts, setPosts] = useState<Array<{ id: string; data: PostDoc }>>([]);

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
    return listenCollection<PostDoc>("posts", setPosts, { limit: 10 });
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

