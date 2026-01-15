"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "./AuthProvider";
import logo from "@/assets/starks-logo.jpg";

export default function Navbar() {
  const { user, userDoc, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image src={logo} alt="Starks Group" width={40} height={40} />
          <span className="font-bold text-lg text-brand-primary">
            Starks Group
          </span>
        </div>

        <nav className="flex items-center gap-5 text-sm font-medium">
          <Link href="/" className="hover:text-brand-primary">Home</Link>
          <Link href="/register" className="hover:text-brand-primary">Register</Link>
          <Link href="/login" className="hover:text-brand-primary">Login</Link>

          {user && (
            <>
              <span className="text-slate-600 text-xs">
                {user.email} · {userDoc?.status}
              </span>

              {userDoc?.role === "admin" && (
                <Link href="/admin" className="text-brand-primary font-semibold">
                  Admin
                </Link>
              )}

              <button
                onClick={logout}
                className="text-red-600 hover:underline"
              >
                Logout
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
