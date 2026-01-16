"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import logo from "@/assets/starks-logo.jpg";
import { useAuth } from "@/lib/AuthContext";
import Button from "@/components/ui/Button";

function initialsFromName(name?: string | null) {
  const n = (name ?? "").trim();
  if (!n) return "U";
  const parts = n.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join("") || "U";
}

export default function DashboardHeader() {
  const { currentUser, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const q = sp.get("q") ?? "";
  const [draft, setDraft] = useState(q);

  // keep UI snappy: update local immediately, commit to URL on blur/enter
  const commit = (next: string) => {
    const nextSp = new URLSearchParams(sp.toString());
    if (next.trim()) nextSp.set("q", next.trim());
    else nextSp.delete("q");
    router.replace(`${pathname}?${nextSp.toString()}`);
  };

  const displayName = useMemo(() => {
    return (
      currentUser?.userDoc?.firstName ||
      currentUser?.userDoc?.name ||
      currentUser?.authUser?.email ||
      "You"
    );
  }, [currentUser]);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4">
        <div className="h-[72px] flex items-center gap-4">
          {/* Brand */}
          <Link href="/dashboard" className="flex items-center gap-3 min-w-[220px]">
            <Image
              src={logo}
              alt="Starks Cricket"
              width={36}
              height={36}
              className="rounded-full ring-1 ring-slate-200"
            />
            <div className="leading-tight">
              <div className="font-extrabold text-lg tracking-tight text-brand-deep">
                Starks Cricket
              </div>
              <div className="text-xs text-slate-500 font-semibold">Estd. 2018</div>
            </div>
          </Link>

          {/* Search */}
          <div className="flex-1 hidden md:block">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
                  <path
                    d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                  <path
                    d="M16.2 16.2 21 21"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={() => commit(draft)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commit(draft);
                  }
                }}
                placeholder="Search posts, members, events..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
              />
            </div>
          </div>

          {/* Right actions */}
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              className="relative h-10 w-10 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition grid place-items-center"
              aria-label="Notifications"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-700" fill="none">
                <path
                  d="M12 22a2.2 2.2 0 0 0 2.2-2.2H9.8A2.2 2.2 0 0 0 12 22Z"
                  fill="currentColor"
                />
                <path
                  d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white" />
            </button>

            <details className="relative">
              <summary className="list-none">
                <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-950 px-3 py-2 text-white hover:bg-slate-900 transition cursor-pointer">
                  <div className="h-7 w-7 rounded-full bg-white/15 grid place-items-center text-xs font-bold">
                    {initialsFromName(displayName)}
                  </div>
                  <div className="text-sm font-semibold">Profile</div>
                </div>
              </summary>

              <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-200 bg-white shadow-lg p-2">
                <div className="px-3 py-2 text-xs text-slate-600">
                  <div className="font-semibold text-slate-900 truncate">{displayName}</div>
                  <div className="mt-1 truncate">{currentUser?.authUser?.email}</div>
                </div>
                <div className="h-px bg-slate-100 my-2" />
                <div className="grid">
                  <Link className="rounded-xl px-3 py-2 hover:bg-slate-50" href="/profile">
                    Profile
                  </Link>
                  <Link className="rounded-xl px-3 py-2 hover:bg-slate-50" href="/profile">
                    Settings
                  </Link>
                  <button
                    className="text-left rounded-xl px-3 py-2 hover:bg-slate-50 text-rose-700"
                    onClick={logout}
                    type="button"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </details>

            <div className="hidden sm:block">
              <Link href="/profile">
                <Button size="sm" variant="outline">
                  Edit Profile
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Mobile search */}
        <div className="md:hidden pb-3">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => commit(draft)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commit(draft);
              }
            }}
            placeholder="Search posts, members, events..."
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
          />
        </div>
      </div>
    </header>
  );
}

