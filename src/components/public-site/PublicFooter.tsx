import Image from "next/image";
import Link from "next/link";

import logo from "@/assets/starks-logo.jpg";
import { ClubSocialLinks } from "@/components/public-site/ClubSocialLinks";
import { PUBLIC_NAV, PUBLIC_SITE } from "@/content/publicSite";
import Container from "@/components/ui/Container";

export default function PublicFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-12 bg-gradient-to-b from-slate-950 to-slate-900 text-white">
      <Container>
        <div className="py-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Image src={logo} alt="" width={40} height={40} className="rounded-md bg-white p-0.5" />
              <div>
                <div className="font-extrabold">{PUBLIC_SITE.clubName}</div>
                <div className="text-xs text-white/70">Estd. {PUBLIC_SITE.established}</div>
              </div>
            </div>
            <p className="text-sm text-white/75 leading-relaxed max-w-sm">{PUBLIC_SITE.aboutBlurb}</p>
          </div>

          <div>
            <div className="font-bold mb-3">Explore</div>
            <ul className="space-y-2 text-sm text-white/75">
              {PUBLIC_NAV.map((item) => (
                <li key={item.href}>
                  <Link className="hover:text-white transition" href={item.href}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="font-bold mb-3">Contact</div>
            <ul className="space-y-2 text-sm text-white/75">
              <li>
                <a className="hover:text-white" href={`mailto:${PUBLIC_SITE.contactEmail}`}>
                  {PUBLIC_SITE.contactEmail}
                </a>
              </li>
              <li>
                <a className="hover:text-white" href={`tel:${PUBLIC_SITE.contactPhone.replace(/\s/g, "")}`}>
                  {PUBLIC_SITE.contactPhone}
                </a>
              </li>
              <li>{PUBLIC_SITE.location}</li>
            </ul>
          </div>

          <div>
            <div className="font-bold mb-3">Follow (photos &amp; match video)</div>
            <p className="text-xs text-white/60 mb-3 max-w-xs">
              Instagram, Facebook and YouTube are our primary channels for match-day media—not duplicated on this site.
            </p>
            <ClubSocialLinks variant="footer" />
          </div>
        </div>

        <div className="py-6 border-t border-white/10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm text-white/60">
          <div>© {year} Starks Cricket Club. All rights reserved.</div>
          <div className="flex flex-wrap gap-4">
            <Link href="/privacy" className="hover:text-white">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-white">
              Terms
            </Link>
            <Link href="/cookies" className="hover:text-white">
              Cookies
            </Link>
          </div>
        </div>
      </Container>
    </footer>
  );
}
