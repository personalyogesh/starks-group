"use client";

import { Suspense, useEffect, useState } from "react";
import { listenCollection, EventDoc, LinkDoc, PostDoc, setRsvp } from "@/lib/firestore";
import { useAuth } from "@/lib/AuthContext";
import { RequireApproved } from "@/components/RequireApproved";
import { isFirebaseConfigured } from "@/lib/firebaseClient";

import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Image from "next/image";
import PostCard from "@/components/feed/PostCard";
import { useSearchParams } from "next/navigation";

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

export default function HomePage() {
  const { currentUser } = useAuth();
  const user = currentUser?.authUser ?? null;
  const userDoc = currentUser?.userDoc ?? null;

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

      {/* Hero (matches screenshot layout) */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center py-6 lg:py-10">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-100/70 border border-blue-200 px-4 py-2 text-sm font-semibold text-brand-deep">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white border border-blue-200">
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 21s-7-4.6-9.5-9.1C.5 8.2 2.8 5.5 6 5.5c1.7 0 3.2.8 4 2 0.8-1.2 2.3-2 4-2 3.2 0 5.5 2.7 3.5 6.4C19 16.4 12 21 12 21z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            Building Communities Through Cricket
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-950">
            Empowering Cricketers,
            <br />
            Strengthening Communities
          </h1>

          <p className="text-slate-600 text-lg leading-relaxed max-w-xl">
            Join Starks Cricket Club, partnered with non-profit organizations to create positive
            change through cricket, teamwork, and community engagement since 2018.
          </p>

          <div className="flex flex-wrap gap-3">
            <a href="/register">
              <Button variant="dark" className="px-6 py-3 rounded-2xl">
                Become a Member
              </Button>
            </a>
            <a href="#about">
              <Button variant="outline" className="px-6 py-3 rounded-2xl">
                Learn More
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
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="relative aspect-[16/10] bg-slate-200">
              {/* Place your team photo at: /public/hero.jpg */}
              <Image src="/hero.jpg" alt="Starks Cricket team photo" fill className="object-cover" priority />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/25 via-transparent to-transparent" />
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar (matches screenshot) */}
      <section className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen bg-brand-primary text-white py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <Stat value="2,500+" label="Active Members" />
            <Stat value="15" label="Sports Programs" />
            <Stat value="8" label="Partner Organizations" />
            <Stat value="50+" label="Community Events" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section
        id="about"
        className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen bg-white border-b border-slate-200/70 py-12"
      >
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center">
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-950">
              Mission & Impact
            </h2>
            <p className="mt-3 text-lg text-slate-600">
              Programs, partnerships, and community outcomes that matter.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
            <FeatureCard
              title="Our Mission"
              desc="Create positive change through cricket, teamwork, mentorship, and inclusive community events."
              icon="🎯"
            />
            <FeatureCard
              title="Programs"
              desc="Youth development, outreach, and competitive teams designed for every skill level."
              icon="🏏"
            />
            <FeatureCard
              title="Community Impact"
              desc="Partnering with non-profits to deliver lasting benefits beyond the boundary."
              icon="🤝"
            />
          </div>
        </div>
      </section>

      {/* Programs */}
      <section
        id="programs"
        className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen bg-slate-50/80 border-y border-slate-200/70 py-12"
      >
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center">
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-950">
              Our Programs
            </h2>
            <p className="mt-3 text-lg text-slate-600">
              Diverse opportunities for all skill levels
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
            <ProgramCard
              title="Youth Development"
              description="Training and mentorship programs for young athletes"
              imageHint="public/program-youth.jpg"
            />
            <ProgramCard
              title="Community Outreach"
              description="Sports events and activities for local communities"
              imageHint="public/program-community.jpg"
            />
            <ProgramCard
              title="Competitive Teams"
              description="Join our competitive leagues and tournaments"
              imageHint="public/program-teams.jpg"
            />
          </div>
        </div>
      </section>

      {/* Partners */}
      <section
        id="partners"
        className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen bg-white py-12"
      >
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center">
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-950">
              Our Non-Profit Partners
            </h2>
            <p className="mt-3 text-lg text-slate-600">Together, we make a difference</p>
          </div>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <PartnerCard title="Community Sports Alliance" />
            <PartnerCard title={"Youth Empowerment\nFoundation"} />
            <PartnerCard title="Athletes for Change" />
            <PartnerCard title="Healthy Lives Initiative" />
          </div>
        </div>
      </section>

      {/* Watch */}
      <section className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen bg-white pb-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="rounded-[28px] overflow-hidden border border-red-200 shadow-sm bg-gradient-to-r from-red-500 to-red-700 text-white">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-8 md:p-10 items-center">
              <div className="space-y-4">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 border border-white/15">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-6 w-6"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <path d="M10 15.5V8.5l6 3.5-6 3.5z" fill="currentColor" />
                    <rect
                      x="3"
                      y="6"
                      width="18"
                      height="12"
                      rx="3"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />
                  </svg>
                </div>

                <h3 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                  Watch Us in Action
                </h3>
                <p className="text-white/85 text-lg leading-relaxed max-w-xl">
                  Subscribe to our YouTube channel for training tips, event highlights, and inspiring
                  stories from our community.
                </p>

                <a
                  href="https://youtube.com/@starkscricket?si=prYW34ROqH5IsV7n"
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button
                    variant="outline"
                    className="bg-white text-slate-950 border-white/20 hover:bg-white/90 px-6 py-3 rounded-2xl"
                  >
                    Visit Our Channel
                  </Button>
                </a>
              </div>

              <div className="relative">
                <div className="rounded-3xl bg-black/15 border border-white/10 aspect-[16/10] flex items-center justify-center">
                  <div className="inline-flex items-center justify-center h-20 w-20 rounded-3xl bg-white/10 border border-white/15">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-10 w-10 text-white/70"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                    >
                      <path d="M10 15.5V8.5l6 3.5-6 3.5z" fill="currentColor" />
                      <rect
                        x="3"
                        y="6"
                        width="18"
                        height="12"
                        rx="3"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Community */}
      <section
        id="community"
        className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen bg-white pb-12"
      >
        <div className="max-w-6xl mx-auto px-4">
          <div className="rounded-[32px] border border-slate-200 bg-[#1F3B8D] text-white px-8 py-14 md:px-14 md:py-20 shadow-sm">
            <div className="mx-auto max-w-3xl text-center">
              <h3 className="text-4xl md:text-5xl font-extrabold tracking-tight">
                Ready to Join Our Community?
              </h3>
              <p className="mt-5 text-lg md:text-xl text-white/90 leading-relaxed">
                Be part of something bigger. Connect with athletes, share your journey, and make an
                impact.
              </p>

              <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
                <a href="/register">
                  <Button
                    variant="outline"
                    className="bg-white text-slate-950 border-white/20 hover:bg-white/90 px-7 py-3 rounded-2xl"
                  >
                    Create Account
                  </Button>
                </a>
                <a href="/login">
                  <Button
                    variant="outline"
                    className="bg-white text-slate-950 border-white/20 hover:bg-white/90 px-7 py-3 rounded-2xl"
                  >
                    Login
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Events */}
        <div id="events" className="lg:col-span-2">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-bold">Upcoming Events</h2>
              <p className="text-sm text-slate-600 mt-1">
                Matches, practices, community meetups, and announcements.
              </p>
            </CardHeader>
            <CardBody>
              {events.length === 0 && (
                <p className="text-slate-600">
                  {isFirebaseConfigured ? "No events yet." : "Connect Firebase to load events."}
                </p>
              )}
              <div className="grid gap-4">
                {events.map(({ id, data }) => (
                  <div
                    key={id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 hover:shadow-sm transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold">{data.title}</div>
                        <div className="text-sm text-slate-600 mt-1">
                          {new Date(data.dateTime).toLocaleString()} · {data.location}
                        </div>
                      </div>
                    </div>

                    {data.description && (
                      <p className="text-sm text-slate-700 mt-3 leading-relaxed">
                        {data.description}
                      </p>
                    )}

                    <RequireApproved>
                      <div className="mt-4 flex gap-2">
                        <Button
                          onClick={() => isFirebaseConfigured && setRsvp(id, user!.uid, "going")}
                          disabled={!isFirebaseConfigured}
                        >
                          Going
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() =>
                            isFirebaseConfigured && setRsvp(id, user!.uid, "interested")
                          }
                          disabled={!isFirebaseConfigured}
                        >
                          Interested
                        </Button>
                      </div>
                    </RequireApproved>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Links */}
        <div>
          <Card>
            <CardHeader>
              <h2 className="text-lg font-bold">Quick Links</h2>
              <p className="text-sm text-slate-600 mt-1">External links, registration, social.</p>
            </CardHeader>
            <CardBody>
              {links.length === 0 && (
                <p className="text-slate-600">
                  {isFirebaseConfigured ? "No links yet." : "Connect Firebase to load links."}
                </p>
              )}
              <div className="grid gap-2">
                {links.map(({ id, data }) => (
                  <a
                    key={id}
                    href={data.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 hover:bg-slate-50 text-sm transition"
                  >
                    <div className="font-medium">{data.title}</div>
                    <div className="text-xs text-slate-500 break-all">{data.url}</div>
                  </a>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Posts */}
      <div>
        <Card>
          <CardHeader>
            <h2 className="text-lg font-bold">Latest Posts</h2>
            <p className="text-sm text-slate-600 mt-1">Updates, announcements, and highlights.</p>
          </CardHeader>
          <CardBody>
            {posts.length === 0 && (
              <p className="text-slate-600">
                {isFirebaseConfigured ? "No posts yet." : "Connect Firebase to load posts."}
              </p>
            )}
            <div className="grid gap-4">
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
          </CardBody>
        </Card>
      </div>

      <div className="h-10" />
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-5xl md:text-6xl font-extrabold tracking-tight">{value}</div>
      <div className="mt-2 text-lg text-white/90">{label}</div>
    </div>
  );
}

function FeatureCard({ title, desc, icon }: { title: string; desc: string; icon: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-7">
      <div className="h-12 w-12 rounded-2xl bg-blue-50 border border-blue-100 text-brand-deep grid place-items-center text-xl">
        {icon}
      </div>
      <div className="mt-5 text-2xl font-extrabold tracking-tight text-slate-950">{title}</div>
      <p className="mt-2 text-slate-600 leading-relaxed">{desc}</p>
    </div>
  );
}

function ProgramCard({
  title,
  description,
  imageHint,
}: {
  title: string;
  description: string;
  imageHint: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="relative aspect-[16/9] bg-gradient-to-br from-slate-100 to-slate-200">
        <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm font-semibold">
          Add photo: <code className="mx-1">{imageHint}</code>
        </div>
      </div>

      <div className="p-6">
        <div className="text-2xl font-extrabold tracking-tight text-slate-950">{title}</div>
        <p className="mt-2 text-slate-600">{description}</p>
      </div>
    </div>
  );
}

function PartnerCard({ title }: { title: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-8 text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100/70 border border-blue-200 text-brand-deep">
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M16 11c1.7 0 3-1.3 3-3S17.7 5 16 5s-3 1.3-3 3 1.3 3 3 3zM8 11c1.7 0 3-1.3 3-3S9.7 5 8 5 5 6.3 5 8s1.3 3 3 3z"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M2.5 19c.8-2.6 3-4 5.5-4s4.7 1.4 5.5 4M11 19c.6-2 2.3-3.4 4.5-3.8 2.6-.5 5.1.7 6 3.8"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <div className="text-xl font-extrabold tracking-tight text-slate-950 whitespace-pre-line">
        {title}
      </div>
    </div>
  );
}

