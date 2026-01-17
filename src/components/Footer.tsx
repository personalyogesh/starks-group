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
                    <div className="text-white/70">starksgroup@starksgrp.org</div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span aria-hidden="true">📞</span>
                  <div>
                    <div className="font-semibold text-white">Phone</div>
                    <div className="text-white/70">909-999-0153</div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span aria-hidden="true">📍</span>
                  <div>
                    <div className="font-semibold text-white">Location</div>
                    <div className="text-white/70">Morrisville, NC</div>
                  </div>
                </div>
              </div>

              {/* Social Media Links */}
              <div className="mt-6">
                <h5 className="font-semibold mb-3">Follow Us</h5>
                <div className="flex gap-3">
                  <a
                    href="https://www.instagram.com/starkscricketclub?igsh=MmU3emNlMmpjNHR0&utm_source=qr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="size-10 bg-gray-800 hover:bg-gradient-to-br hover:from-purple-600 hover:via-pink-600 hover:to-orange-500 rounded-full flex items-center justify-center transition-all duration-300 group"
                    aria-label="Instagram"
                  >
                    <svg
                      className="size-5 text-gray-400 group-hover:text-white transition-colors"
                      fill="none"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                    >
                      <path
                        d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Z"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                      <path
                        d="M16 11.37a4 4 0 1 1-7.75 1.26 4 4 0 0 1 7.75-1.26Z"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                      <path
                        d="M17.5 6.5h.01"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </a>

                  <a
                    href="https://x.com/clubstarks?s=21&t=BAMIGs5adc1xl19nJGtDEw"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="size-10 bg-gray-800 hover:bg-black rounded-full flex items-center justify-center transition-all duration-300 group"
                    aria-label="X (Twitter)"
                  >
                    <svg
                      className="size-5 text-gray-400 group-hover:text-white transition-colors"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                    >
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </a>
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
            <div>© 2026 Starks Cricket Club. All rights reserved.</div>

            <div className="flex items-center gap-6">
              <div className="hidden md:flex items-center gap-3">
                <a
                  className="hover:text-white transition"
                  href="https://youtube.com/@starkscricket?si=prYW34ROqH5IsV7n"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="YouTube"
                >
                  ▶
                </a>
                <a
                  className="hover:text-white transition"
                  href="https://instagram.com"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Instagram"
                >
                  ⌁
                </a>
                <a
                  className="hover:text-white transition"
                  href="https://facebook.com"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Facebook"
                >
                  f
                </a>
              </div>
              <Link className="hover:text-white transition" href="/privacy">
                Privacy Policy
              </Link>
              <Link className="hover:text-white transition" href="/terms">
                Terms of Service
              </Link>
              <Link className="hover:text-white transition" href="/cookies">
                Cookies
              </Link>
            </div>
          </div>
        </Container>
      </div>
    </footer>
  );
}

