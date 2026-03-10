import type { Partner } from "@/lib/firebase/partnersService";

export type FeaturedPartnerContent = {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  location: string;
  instagramUrl: string;
  instagramHandle: string;
  phoneHref: string;
  phoneLabel: string;
  category: string;
  seasonLabel: string;
  promoNote: string;
  imageSrc: string;
  partnerHref: string;
};

export const featuredPartnerFallback: FeaturedPartnerContent = {
  id: "featured-hashtag-india",
  name: "Hashtag India",
  subtitle: "INDIAN AUTHENTIC FOOD",
  description:
    "Experience authentic Indian cuisine in the heart of Cary, NC. Hashtag India proudly supports Starks Cricket for the 2026 season.",
  location: "Cary, NC",
  instagramUrl: "https://www.instagram.com/hashtagindia_cary_nc?igsh=MWI1em95NTFkMzVkbg==",
  instagramHandle: "@hashtagindia_cary_nc",
  phoneHref: "tel:+19192441742",
  phoneLabel: "919-244-1742",
  category: "Food & Dining",
  seasonLabel: "Featured Partner - 2026 Season",
  promoNote: 'Mention "Starks Cricket" for special offers when you visit.',
  imageSrc: "/partners/hashtag-india-optimized.png",
  partnerHref: "/partners",
};

function instagramHandleFromUrl(url?: string) {
  if (!url) return featuredPartnerFallback.instagramHandle;
  try {
    const parts = new URL(url).pathname.split("/").filter(Boolean);
    const handle = parts[0];
    return handle ? `@${handle}` : featuredPartnerFallback.instagramHandle;
  } catch {
    return featuredPartnerFallback.instagramHandle;
  }
}

function phoneHref(raw?: string) {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (!digits) return featuredPartnerFallback.phoneHref;
  return digits.startsWith("1") ? `tel:+${digits}` : `tel:+1${digits}`;
}

function phoneLabel(raw?: string) {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  if (digits.length === 11 && digits.startsWith("1")) {
    return `${digits.slice(1, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return featuredPartnerFallback.phoneLabel;
}

export function toFeaturedPartnerContent(partner?: Partner | null): FeaturedPartnerContent {
  if (!partner) return featuredPartnerFallback;

  const partnerWithExtras = partner as Partner & {
    subtitle?: string;
    location?: string;
    phoneNumber?: string;
    category?: string;
    promoNote?: string;
  };

  return {
    id: partner.id,
    name: partner.name || featuredPartnerFallback.name,
    subtitle: partnerWithExtras.subtitle || featuredPartnerFallback.subtitle,
    description: partner.description || featuredPartnerFallback.description,
    location: partnerWithExtras.location || featuredPartnerFallback.location,
    instagramUrl: partner.socialMedia?.instagram || featuredPartnerFallback.instagramUrl,
    instagramHandle: instagramHandleFromUrl(partner.socialMedia?.instagram),
    phoneHref: phoneHref(partnerWithExtras.phoneNumber),
    phoneLabel: phoneLabel(partnerWithExtras.phoneNumber),
    category: partnerWithExtras.category || featuredPartnerFallback.category,
    seasonLabel: partner.partnerSince
      ? `Featured Partner - ${partner.partnerSince} Season`
      : featuredPartnerFallback.seasonLabel,
    promoNote: partnerWithExtras.promoNote || featuredPartnerFallback.promoNote,
    imageSrc: partner.logoUrl || featuredPartnerFallback.imageSrc,
    partnerHref: `/partners?partner=${partner.id}`,
  };
}
