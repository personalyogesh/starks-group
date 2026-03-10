"use client";

import Image from "next/image";
import Link from "next/link";
import { ExternalLink, Heart, Instagram, MapPin, Phone } from "lucide-react";

import type { FeaturedPartnerContent } from "@/lib/featuredPartner";
import Button from "@/components/ui/Button";

export default function FeaturedPartnerSpotlight({
  partner,
  showMoreDetails = true,
}: {
  partner: FeaturedPartnerContent;
  showMoreDetails?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_16px_48px_rgba(15,23,42,0.08)]">
      <div className="flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 text-center text-xs font-extrabold uppercase tracking-[0.16em] text-white sm:text-sm">
        <Heart className="size-4 fill-white text-white" />
        <span>{partner.seasonLabel}</span>
      </div>

      <div className="grid lg:grid-cols-2">
        <div className="bg-gradient-to-br from-orange-50 to-blue-50 p-6 sm:p-8 lg:p-16 flex items-center justify-center">
          <div className="text-center space-y-4 md:space-y-6">
            <div className="inline-block rounded-3xl bg-white p-4 shadow-lg sm:p-6 lg:p-8">
              <div className="relative h-20 w-56 sm:h-24 sm:w-64 lg:h-28 lg:w-80">
                <Image src={partner.imageSrc} alt={partner.name} fill unoptimized className="object-contain" />
              </div>
            </div>

            <span className="inline-block rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-md">
              {partner.category}
            </span>
          </div>
        </div>

        <div className="flex flex-col justify-center space-y-5 p-5 sm:p-6 lg:p-12">
          <div>
            <h3 className="text-3xl font-extrabold text-slate-950 sm:text-4xl">{partner.name}</h3>
            <p className="mt-2 text-lg font-bold uppercase tracking-wide text-green-600">{partner.subtitle}</p>
          </div>

          <p className="text-base leading-relaxed text-slate-600 sm:text-lg">{partner.description}</p>

          <div className="flex items-center gap-2 text-slate-700">
            <MapPin className="size-5 text-slate-500" />
            <span className="font-medium">{partner.location}</span>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <a
              href={partner.instagramUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-fuchsia-600 via-pink-500 to-orange-500 px-5 py-4 text-base font-semibold text-white shadow-sm"
            >
              <Instagram className="size-5" />
              <span>{partner.instagramHandle}</span>
              <ExternalLink className="size-4" />
            </a>

            <div className="flex flex-col gap-3 sm:flex-row">
              <a
                href={partner.phoneHref}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Phone className="size-4" />
                <span>{partner.phoneLabel}</span>
              </a>

              {showMoreDetails && (
                <Link href={partner.partnerHref} className="inline-flex">
                  <Button variant="dark" className="w-full sm:w-auto">
                    More Details
                  </Button>
                </Link>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-center text-sm font-medium text-slate-700">
            {partner.promoNote}
          </div>
        </div>
      </div>
    </div>
  );
}
