"use client";

import Link from "next/link";
import Image from "next/image";
import Container from "@/components/ui/Container";
import logo from "@/assets/starks-logo.jpg";

export default function Footer() {
  return (
    <footer className="mt-16 bg-gradient-to-b from-slate-950 to-slate-900 text-white">
      <div className="border-t border-white/10">
        <Container>
          <div className="py-14 grid grid-cols-1 md:grid-cols-4 gap-10">
            {/* Brand */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Image
                  src={logo}
                  alt="Starks Cricket"
                  width={44}
                  height={44}
                  className="rounded-md bg-white p-1"
                />
                <div className="leading-tight">
                  <div className="font-extrabold text-lg">Starks Cricket</div>
                  <div className="text-xs text-white/70 font-semibold">Estd. 2018</div>
                </div>
              </div>

              <p className="text-white/70 leading-relaxed">
                Building communities through cricket and partnerships. Excellence, teamwork, and
                community since 2018.
              </p>
            </div>

            {/* Quick links */}
            <div className="space-y-3">
              <div className="font-bold">Quick Links</div>
              <div className="grid gap-2 text-white/70">
                <a className="hover:text-white transition" href="#about">
                  About Us
                </a>
                <a className="hover:text-white transition" href="#programs">
                  Programs
                </a>
                <a className="hover:text-white transition" href="#partners">
                  Partners
                </a>
                <a className="hover:text-white transition" href="#community">
                  Community
                </a>
              </div>
            </div>

            {/* Get involved */}
            <div className="space-y-3">
              <div className="font-bold">Get Involved</div>
              <div className="grid gap-2 text-white/70">
                <Link className="hover:text-white transition" href="/register">
                  Volunteer
                </Link>
                <a className="hover:text-white transition" href="#donate">
                  Donate
                </a>
                <a className="hover:text-white transition" href="#partners">
                  Partner With Us
                </a>
                <a className="hover:text-white transition" href="#events">
                  Events
                </a>
              </div>
            </div>

            {/* Contact */}
            <div className="space-y-3">
              <div className="font-bold">Contact Us</div>

              <div className="grid gap-3 text-white/75">
                <div className="flex gap-3">
                  <span aria-hidden="true">📧</span>
                  <div>
                    <div className="font-semibold text-white">Email</div>
                    <div className="text-white/70">contact@starkscricket.org</div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span aria-hidden="true">📞</span>
                  <div>
                    <div className="font-semibold text-white">Phone</div>
                    <div className="text-white/70">+1 (555) 123-4567</div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span aria-hidden="true">📍</span>
                  <div>
                    <div className="font-semibold text-white">Location</div>
                    <div className="text-white/70">123 Cricket Ground, City, ST 12345</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <Container>
          <div className="py-6 flex flex-col md:flex-row items-center justify-between gap-4 text-white/60">
            <div>© {new Date().getFullYear()} Starks Cricket Club. All rights reserved.</div>

            <div className="flex items-center gap-6">
              <a className="hover:text-white transition" href="#privacy">
                Privacy Policy
              </a>
              <a className="hover:text-white transition" href="#terms">
                Terms of Service
              </a>
              <a className="hover:text-white transition" href="#cookies">
                Cookies
              </a>
            </div>
          </div>
        </Container>
      </div>
    </footer>
  );
}

