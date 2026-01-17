"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/AuthContext";
import logo from "@/assets/starks-logo.jpg";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";

export default function Navbar() {
  const { currentUser, logout } = useAuth();
  const user = currentUser?.authUser ?? null;
  const userDoc = currentUser?.userDoc ?? null;

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
      <Container>
        <div className="py-4 flex items-center justify-between gap-4 relative">
          {/* Left: brand */}
          <Link href="/" className="flex items-center gap-3 whitespace-nowrap">
            <Image
              src={logo}
              alt="Starks Cricket"
              width={40}
              height={40}
              className="rounded-full ring-1 ring-slate-200"
            />
            <div className="leading-tight">
              <div className="font-extrabold text-lg tracking-tight text-brand-deep">
                Starks Cricket
              </div>
              <div className="text-xs text-slate-500 font-semibold">Estd. 2018</div>
            </div>
          </Link>

          {/* Center: nav (desktop) — absolute center to match Figma even when right side changes */}
          <nav className="hidden md:flex items-center gap-2 text-sm font-semibold text-slate-600 absolute left-1/2 -translate-x-1/2 whitespace-nowrap">
            <a className="rounded-xl px-3 py-2 hover:bg-slate-100 transition" href="#about">
              About
            </a>
            <a className="rounded-xl px-3 py-2 hover:bg-slate-100 transition" href="#programs">
              Programs
            </a>
            <a className="rounded-xl px-3 py-2 hover:bg-slate-100 transition" href="#events">
              Events
            </a>
            <a className="rounded-xl px-3 py-2 hover:bg-slate-100 transition" href="#partners">
              Partners
            </a>
            <a className="rounded-xl px-3 py-2 hover:bg-slate-100 transition" href="#community">
              Community
            </a>
          </nav>

          {/* Right: actions */}
          <div className="flex items-center justify-end gap-2 whitespace-nowrap">
            {user ? (
              <>
                <Link href="/create-post" className="hidden sm:inline-flex">
                  <Button size="sm" variant="dark">
                    Create Post
                  </Button>
                </Link>

                {/* Compact account menu to avoid breaking the header alignment */}
                <details className="relative">
                  <summary className="list-none">
                    <Button size="sm" variant="outline">
                      Account
                    </Button>
                  </summary>
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-slate-200 bg-white shadow-lg p-2">
                    <div className="px-3 py-2 text-xs text-slate-600">
                      <div className="font-semibold text-slate-900 truncate">{user.email}</div>
                      <div className="mt-1">
                        status: <b>{userDoc?.status ?? "unknown"}</b>
                        {" · "}
                        role: <b>{userDoc?.role ?? "unknown"}</b>
                      </div>
                    </div>
                    <div className="h-px bg-slate-100 my-2" />
                    <div className="grid">
                      <Link className="rounded-xl px-3 py-2 hover:bg-slate-50" href="/profile">
                        Profile
                      </Link>
                      <Link className="rounded-xl px-3 py-2 hover:bg-slate-50" href="/create-post">
                        Create Post
                      </Link>
                      {userDoc?.role === "admin" && (
                        <Link className="rounded-xl px-3 py-2 hover:bg-slate-50" href="/admin">
                          Admin
                        </Link>
                      )}
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
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button size="sm" variant="outline">
                    Login
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm" variant="dark">
                    Join Us
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </Container>
    </header>
  );
}
