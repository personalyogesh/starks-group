"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Heart, Instagram, MapPin } from "lucide-react";
import { trackPartnerClick } from "@/lib/analytics/partnerEvents";
import { getPartners, type Partner } from "@/services/partnerService";

interface PartnersPageProps {
  navigateTo: (page: string) => void;
}

const FALLBACK_PARTNER: Partner = {
  id: "fallback-hashtag-india",
  name: "Hashtag India",
  tagline: "INDIAN AUTHENTIC FOOD",
  description:
    "Experience authentic Indian cuisine in the heart of Cary, NC. Hashtag India proudly supports Starks Cricket for the 2026 season.",
  logoUrl: "/partners/hashtag-india-optimized.png",
  location: "Cary, NC",
  category: "Food & Dining",
  instagramHandle: "@hashtagindia_cary_nc",
  instagramUrl: "https://www.instagram.com/hashtagindia_cary_nc?igsh=MWI1em95NTFkMzVkbg==",
  websiteUrl: undefined,
  isFeatured: true,
  order: 0,
  createdAt: "",
  updatedAt: "",
};

export function PartnersPage({ navigateTo }: PartnersPageProps) {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      try {
        const rows = await getPartners();
        if (!cancelled) {
          setPartners(rows);
          setLoadError(null);
        }
      } catch (error) {
        console.error("Failed to load partners:", error);
        if (!cancelled) {
          setPartners([]);
          setLoadError("Could not load live partners. Showing featured sponsor fallback.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const effectivePartners = partners.length > 0 ? partners : [FALLBACK_PARTNER];
  const featuredPartner = effectivePartners.find((p) => p.isFeatured) ?? effectivePartners[0] ?? null;
  const otherPartners = effectivePartners.filter((p) => p.id !== featuredPartner?.id);

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white pt-20 md:pt-24 pb-14 md:pb-16">
      <div className="container mx-auto px-4 md:px-6 max-w-7xl">
        <div className="text-center mb-10 md:mb-16">
          <span className="inline-block px-4 py-2 rounded-full bg-primary-100 text-primary-700 text-sm font-semibold uppercase tracking-wide mb-4">
            Our Partners
          </span>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-neutral-900 mb-3 md:mb-4">Powering Starks Cricket</h1>
          <p className="text-base md:text-xl text-neutral-600 max-w-2xl mx-auto">
            We are grateful for our amazing partners who make our cricket community possible.
          </p>
        </div>

        {isLoading && (
          <div className="mb-10 text-center text-neutral-600">
            <div className="inline-flex items-center gap-2">
              <span className="w-5 h-5 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
              Loading partners...
            </div>
          </div>
        )}

        {loadError && (
          <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {loadError}
          </div>
        )}

        {featuredPartner && (
          <div className="mb-12 md:mb-16">
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-neutral-200 hover:shadow-[0_24px_60px_-24px_rgba(0,0,0,0.35)] transition-all duration-500">
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3 flex items-center justify-center gap-2">
                <Heart className="w-5 h-5 text-white fill-white" />
                <span className="text-white font-bold uppercase tracking-wide text-xs md:text-sm">
                  Featured Partner - 2026 Season
                </span>
              </div>

              <div className="grid lg:grid-cols-2 gap-0">
                <div className="bg-gradient-to-br from-orange-50 to-blue-50 p-6 sm:p-8 lg:p-16 flex items-center justify-center">
                  <div className="text-center space-y-4 md:space-y-6">
                    <div className="bg-white rounded-2xl p-4 sm:p-6 lg:p-8 shadow-lg inline-block">
                      <a
                        href={featuredPartner.instagramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                        onClick={() =>
                          trackPartnerClick({
                            section: "partners_page",
                            linkType: "featured_logo_instagram",
                            partnerName: featuredPartner.name,
                            destination: featuredPartner.instagramUrl,
                          })
                        }
                      >
                        <PartnerLogo
                          src={featuredPartner.logoUrl}
                          alt={featuredPartner.name}
                          className="h-20 sm:h-24 lg:h-28 w-56 sm:w-64 lg:w-80"
                        />
                      </a>
                    </div>

                    <span className="inline-block px-4 py-2 rounded-full bg-white text-primary-700 text-sm font-semibold shadow-md">
                      {featuredPartner.category}
                    </span>
                  </div>
                </div>

                <div className="p-5 sm:p-6 lg:p-12 flex flex-col justify-center space-y-5 md:space-y-6">
                  <div>
                    <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-neutral-900 mb-2">{featuredPartner.name}</h2>
                    <p className="text-base md:text-xl font-semibold text-green-600 mb-4 md:mb-6 uppercase tracking-wide">
                      {featuredPartner.tagline}
                    </p>
                  </div>

                  <p className="text-base md:text-lg text-neutral-600 leading-relaxed">{featuredPartner.description}</p>

                  <div className="flex items-center gap-2 text-neutral-700">
                    <MapPin className="w-5 h-5 text-primary-600" />
                    <span className="font-medium">{featuredPartner.location}</span>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 md:gap-4 pt-2 md:pt-4">
                    <a
                      href={featuredPartner.instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-3 px-5 md:px-6 py-3.5 md:py-4 rounded-xl font-bold text-base md:text-lg min-h-12 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 text-white hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 group"
                      onClick={() =>
                        trackPartnerClick({
                          section: "partners_page",
                          linkType: "featured_instagram",
                          partnerName: featuredPartner.name,
                          destination: featuredPartner.instagramUrl,
                        })
                      }
                    >
                      <Instagram className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                      <span>{featuredPartner.instagramHandle}</span>
                      <ExternalLink className="w-5 h-5 opacity-70" />
                    </a>

                    {featuredPartner.websiteUrl && (
                      <a
                        href={featuredPartner.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 px-5 md:px-6 py-3.5 md:py-4 rounded-xl font-semibold min-h-12 bg-neutral-900 text-white hover:bg-neutral-800 hover:shadow-lg hover:scale-[1.02] transition-all duration-300"
                        onClick={() =>
                          trackPartnerClick({
                            section: "partners_page",
                            linkType: "featured_website",
                            partnerName: featuredPartner.name,
                            destination: featuredPartner.websiteUrl,
                          })
                        }
                      >
                        Visit Website
                        <ExternalLink className="w-5 h-5" />
                      </a>
                    )}
                  </div>

                  <div className="bg-gradient-to-r from-orange-100 to-blue-100 rounded-xl p-4 border-2 border-orange-200">
                    <p className="text-sm text-neutral-800 text-center font-medium">
                      Mention <strong>&quot;Starks Cricket&quot;</strong> for special offers when you visit.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {otherPartners.length > 0 && (
          <div>
            <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-neutral-900 mb-6 md:mb-8 text-center">Supporting Partners</h2>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {otherPartners.map((partner) => (
                <div
                  key={partner.id}
                  className="bg-white rounded-2xl shadow-lg border border-neutral-200 overflow-hidden hover:shadow-2xl hover:scale-105 transition-all duration-300"
                >
                  <div className="bg-neutral-50 p-6 md:p-8 flex items-center justify-center h-44 md:h-48">
                    <PartnerLogo src={partner.logoUrl} alt={partner.name} className="h-20 w-52" />
                  </div>

                  <div className="p-6 space-y-4">
                    <div>
                      <h3 className="text-xl font-bold text-neutral-900 mb-1">{partner.name}</h3>
                      <span className="inline-block px-3 py-1 rounded-full bg-primary-100 text-primary-700 text-xs font-semibold">
                        {partner.category}
                      </span>
                    </div>

                    <p className="text-sm text-neutral-600 line-clamp-3">{partner.description}</p>

                    <div className="flex items-center gap-2 text-sm text-neutral-700">
                      <MapPin className="w-4 h-4 text-primary-600" />
                      <span>{partner.location}</span>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <a
                        href={partner.instagramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg min-h-11 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-semibold hover:shadow-lg transition-all"
                        onClick={() =>
                          trackPartnerClick({
                            section: "partners_page",
                            linkType: "supporting_instagram",
                            partnerName: partner.name,
                            destination: partner.instagramUrl,
                          })
                        }
                      >
                        <Instagram className="w-4 h-4" />
                        Instagram
                      </a>

                      {partner.websiteUrl && (
                        <a
                          href={partner.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2.5 rounded-lg min-h-11 bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition-colors"
                          title="Visit Website"
                          onClick={() =>
                            trackPartnerClick({
                              section: "partners_page",
                              linkType: "supporting_website",
                              partnerName: partner.name,
                              destination: partner.websiteUrl,
                            })
                          }
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-12 md:mt-16 bg-gradient-to-r from-primary-600 to-accent-600 rounded-3xl p-6 sm:p-8 lg:p-12 text-center text-white shadow-2xl">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3 md:mb-4">Interested in Partnering with Us?</h2>
          <p className="text-base md:text-lg lg:text-xl mb-6 md:mb-8 max-w-2xl mx-auto opacity-90">
            Join us in supporting the cricket community. Partnership opportunities available for the 2027 season.
          </p>
          <button
            onClick={() => {
              trackPartnerClick({
                section: "partners_page",
                linkType: "contact_partnership_cta",
              });
              navigateTo("contact");
            }}
            className="w-full sm:w-auto px-6 sm:px-8 py-3.5 md:py-4 rounded-xl font-bold text-base md:text-lg min-h-12 bg-white text-primary-600 hover:bg-neutral-100 hover:shadow-xl hover:scale-[1.02] transition-all duration-300"
          >
            Contact Us About Partnerships
          </button>
        </div>

        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-2 text-neutral-600">
            <Heart className="w-5 h-5 text-red-500 fill-red-500" />
            <span className="text-lg">Thank you to all our partners for making Starks Cricket possible.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PartnerLogo({ src, alt, className }: { src?: string; alt: string; className: string }) {
  const [currentSrc, setCurrentSrc] = useState(src || "/partners/hashtag-india-optimized.png");

  useEffect(() => {
    setCurrentSrc(src || "/partners/hashtag-india-optimized.png");
  }, [src]);

  if (!currentSrc) {
    return (
      <div className={`${className} rounded-xl border border-neutral-200 bg-neutral-50 flex items-center justify-center text-xs font-semibold text-neutral-500`}>
        {alt}
      </div>
    );
  }

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={`${className} object-contain`}
      onError={() => setCurrentSrc("/partners/hashtag-india-optimized.png")}
      loading="lazy"
    />
  );
}
