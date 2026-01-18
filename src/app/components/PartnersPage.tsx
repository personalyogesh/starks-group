"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Award,
  ExternalLink,
  Facebook,
  Instagram,
  Linkedin,
  Play,
  Twitter,
} from "lucide-react";

import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";
import { isFirebaseConfigured } from "@/lib/firebaseClient";
import { getAllPartners, Partner, PartnerTier, PartnerType } from "@/lib/firebase/partnersService";
import { useAuth } from "@/lib/AuthContext";
import { LoadingSpinner } from "@/components/LoadingSpinner";

const TIER_LABEL: Record<PartnerTier, string> = {
  platinum: "Platinum",
  gold: "Gold",
  silver: "Silver",
  bronze: "Bronze",
  community: "Community",
};

const TYPE_LABEL: Record<PartnerType, string> = {
  corporate: "Corporate",
  nonprofit: "Nonprofit",
  individual: "Individual",
  media: "Media",
};

function safeHost(url?: string) {
  try {
    if (!url) return "";
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function tierBadgeClass(tier: PartnerTier) {
  switch (tier) {
    case "platinum":
      return "bg-gradient-to-r from-slate-400 to-slate-600 text-white";
    case "gold":
      return "bg-gradient-to-r from-yellow-400 to-yellow-600 text-slate-950";
    case "silver":
      return "bg-gradient-to-r from-gray-200 to-gray-400 text-slate-900";
    case "bronze":
      return "bg-gradient-to-r from-amber-600 to-amber-800 text-white";
    case "community":
      return "bg-gradient-to-r from-emerald-400 to-emerald-600 text-white";
    default:
      return "bg-slate-200 text-slate-900";
  }
}

function tierLabel(tier: PartnerTier) {
  return `${TIER_LABEL[tier]} Partner`;
}

export default function PartnersPage() {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.userDoc?.role === "admin";

  const [loading, setLoading] = useState(true);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [tier, setTier] = useState<"all" | PartnerTier>("all");
  const [type, setType] = useState<"" | PartnerType>("");
  const [onlyFeatured, setOnlyFeatured] = useState(false);

  const [selected, setSelected] = useState<Partner | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        if (!isFirebaseConfigured) {
          setPartners([]);
          setError("Connect Firebase to load partners.");
          return;
        }
        const all = await getAllPartners();
        if (!cancelled) setPartners(all);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load partners.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return partners.filter((p) => {
      if (onlyFeatured && !p.featured) return false;
      if (tier !== "all" && p.tier !== tier) return false;
      if (type && p.type !== type) return false;
      if (!s) return true;
      return (
        p.name.toLowerCase().includes(s) ||
        (p.description ?? "").toLowerCase().includes(s) ||
        safeHost(p.websiteUrl).toLowerCase().includes(s)
      );
    });
  }, [partners, q, tier, type, onlyFeatured]);

  const partnersByTier = useMemo(() => {
    return {
      platinum: partners.filter((p) => p.tier === "platinum"),
      gold: partners.filter((p) => p.tier === "gold"),
      silver: partners.filter((p) => p.tier === "silver"),
      bronze: partners.filter((p) => p.tier === "bronze"),
      community: partners.filter((p) => p.tier === "community"),
    } as const;
  }, [partners]);

  function openPartnerDetail(p: Partner) {
    setSelected(p);
    setDetailOpen(true);
  }

  if (loading) return <LoadingSpinner message="Loading partners..." />;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-16 gap-3">
            <Link href="/" className="shrink-0">
              <Button variant="outline">
                <ArrowLeft className="size-4 mr-2" />
                Back
              </Button>
            </Link>

            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity min-w-0">
              <Image src="/starks-logo.jpg" alt="Starks Cricket" width={40} height={40} className="rounded-full" />
              <div className="hidden sm:block leading-tight min-w-0">
                <div className="text-lg font-extrabold text-brand-deep truncate">Starks Cricket</div>
                <div className="text-xs text-slate-500 font-semibold">Estd. 2018</div>
              </div>
            </Link>

            {isAdmin ? (
              <Link href="/admin/partners" className="shrink-0">
                <Button variant="dark">Manage Partners</Button>
              </Link>
            ) : (
              <div className="w-[140px]" />
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-16">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <Award className="size-14 mx-auto mb-5" />
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Our Partners & Sponsors</h1>
          <p className="text-lg md:text-xl max-w-3xl mx-auto text-blue-100">
            We’re grateful for the generous support of our partners who make our mission possible. Together, we’re
            building a stronger cricket community.
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-10 space-y-6">
        {/* Filters */}
        <Card>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_180px_160px] gap-3">
              <Input
                placeholder="Search partners…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="bg-slate-50 border-slate-200"
              />
              <Select
                value={tier}
                onChange={(e) => setTier(e.target.value as any)}
                className="bg-slate-50 border-slate-200"
              >
                <option value="all">All tiers</option>
                <option value="platinum">Platinum</option>
                <option value="gold">Gold</option>
                <option value="silver">Silver</option>
                <option value="bronze">Bronze</option>
                <option value="community">Community</option>
              </Select>
              <Select value={type} onChange={(e) => setType(e.target.value as any)} className="bg-slate-50 border-slate-200">
                <option value="">All types</option>
                <option value="corporate">Corporate</option>
                <option value="nonprofit">Nonprofit</option>
                <option value="individual">Individual</option>
                <option value="media">Media</option>
              </Select>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 select-none">
                <input
                  type="checkbox"
                  checked={onlyFeatured}
                  onChange={(e) => setOnlyFeatured(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Featured only
              </label>
            </div>
          </CardBody>
        </Card>

        {error && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {error}
          </div>
        )}

        {/* “Tabs” by tier (quick filter) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <button
            type="button"
            onClick={() => setTier("all")}
            className={[
              "rounded-2xl border px-3 py-2 text-sm font-extrabold transition",
              tier === "all" ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-800",
            ].join(" ")}
          >
            All ({partners.length})
          </button>
          {(["platinum", "gold", "silver", "bronze", "community"] as PartnerTier[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTier(t)}
              className={[
                "rounded-2xl border px-3 py-2 text-sm font-extrabold transition",
                tier === t ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-800",
              ].join(" ")}
            >
              {TIER_LABEL[t]} ({partnersByTier[t].length})
            </button>
          ))}
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <Card>
            <CardBody>
              <div className="text-slate-600 text-center py-10">
                <Award className="size-14 mx-auto text-slate-300 mb-3" />
                <div className="font-extrabold text-slate-900">No Partners Yet</div>
                <div className="mt-1 text-sm">We’re looking for partners to support our mission!</div>
                {isAdmin && (
                  <div className="mt-5">
                    <Link href="/admin/partners">
                      <Button variant="dark">Add First Partner</Button>
                    </Link>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        ) : (
          <PartnerGrid partners={filtered} onPartnerClick={openPartnerDetail} />
        )}

        {/* Become a Partner CTA */}
        <div className="mt-2">
          <Card>
            <CardBody>
              <div className="rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-8 text-center">
                <h2 className="text-2xl md:text-3xl font-extrabold">Become a Partner</h2>
                <p className="mt-3 text-white/90 text-lg">
                  Support our mission and help us grow cricket in the community.
                </p>
                <div className="mt-6">
                  <a href="mailto:starksgroup@starksgrp.org?subject=Partnership%20Inquiry">
                    <Button
                      variant="outline"
                      className="bg-white text-slate-950 border-white/20 hover:bg-white/90 px-6 py-3 rounded-2xl"
                    >
                      Contact Us About Partnership
                    </Button>
                  </a>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Detail Modal */}
      <Modal
        open={detailOpen}
        title={selected?.name ?? "Partner"}
        onClose={() => setDetailOpen(false)}
        maxWidthClassName="max-w-3xl"
        footer={
          <div className="flex items-center justify-end gap-2">
            {selected?.websiteUrl ? (
              <a href={selected.websiteUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="dark">
                  <ExternalLink className="size-4 mr-2" />
                  Visit Website
                </Button>
              </a>
            ) : null}
            <Button variant="outline" onClick={() => setDetailOpen(false)}>
              Close
            </Button>
          </div>
        }
      >
        {selected ? (
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="relative h-20 w-20 rounded-2xl overflow-hidden border border-slate-200 bg-white shrink-0">
                {selected.logoUrl ? (
                  <Image src={selected.logoUrl} alt={`${selected.name} logo`} fill className="object-contain p-2" />
                ) : (
                  <div className="h-full w-full grid place-items-center text-xs font-bold text-slate-500">Logo</div>
                )}
              </div>
              <div className="min-w-0">
                <div
                  className={[
                    "inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold",
                    tierBadgeClass(selected.tier),
                  ].join(" ")}
                >
                  {tierLabel(selected.tier)}
                </div>
                <div className="mt-3 text-sm text-slate-700 whitespace-pre-wrap">{selected.description}</div>
                <div className="mt-3 text-xs font-bold text-slate-500">
                  {TYPE_LABEL[selected.type]}
                  {selected.partnerSince ? ` · Partner since ${selected.partnerSince}` : ""}
                </div>
              </div>
            </div>

            {selected.videoUrl ? (
              <div>
                <div className="font-extrabold text-slate-900 mb-2">Featured Video</div>
                <div className="aspect-video rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
                  <iframe
                    src={selected.videoUrl}
                    className="w-full h-full"
                    allowFullScreen
                    title={`${selected.name} video`}
                  />
                </div>
              </div>
            ) : null}

            {selected.galleryImages?.length ? (
              <div>
                <div className="font-extrabold text-slate-900 mb-2">Gallery</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selected.galleryImages.map((url, idx) => (
                    <div
                      key={idx}
                      className="relative aspect-video rounded-2xl overflow-hidden border border-slate-200 bg-slate-100"
                    >
                      <Image src={url} alt={`${selected.name} ${idx + 1}`} fill className="object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Social Links */}
            <div className="flex flex-wrap items-center gap-2">
              {selected.websiteUrl ? (
                <a href={selected.websiteUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm">
                    <ExternalLink className="size-4 mr-2" />
                    {safeHost(selected.websiteUrl) || "Website"}
                  </Button>
                </a>
              ) : null}

              {selected.videoUrl ? (
                <a href={selected.videoUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm">
                    <Play className="size-4 mr-2" />
                    Video
                  </Button>
                </a>
              ) : null}

              {selected.socialMedia?.facebook ? (
                <a href={selected.socialMedia.facebook} target="_blank" rel="noopener noreferrer" title="Facebook">
                  <Button variant="outline" size="sm" className="h-10 w-10 p-0 rounded-2xl grid place-items-center">
                    <Facebook className="size-4" />
                  </Button>
                </a>
              ) : null}
              {selected.socialMedia?.twitter ? (
                <a href={selected.socialMedia.twitter} target="_blank" rel="noopener noreferrer" title="Twitter">
                  <Button variant="outline" size="sm" className="h-10 w-10 p-0 rounded-2xl grid place-items-center">
                    <Twitter className="size-4" />
                  </Button>
                </a>
              ) : null}
              {selected.socialMedia?.instagram ? (
                <a href={selected.socialMedia.instagram} target="_blank" rel="noopener noreferrer" title="Instagram">
                  <Button variant="outline" size="sm" className="h-10 w-10 p-0 rounded-2xl grid place-items-center">
                    <Instagram className="size-4" />
                  </Button>
                </a>
              ) : null}
              {selected.socialMedia?.linkedin ? (
                <a href={selected.socialMedia.linkedin} target="_blank" rel="noopener noreferrer" title="LinkedIn">
                  <Button variant="outline" size="sm" className="h-10 w-10 p-0 rounded-2xl grid place-items-center">
                    <Linkedin className="size-4" />
                  </Button>
                </a>
              ) : null}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function PartnerGrid({
  partners,
  onPartnerClick,
}: {
  partners: Partner[];
  onPartnerClick: (partner: Partner) => void;
}) {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {partners.map((partner) => (
        <Card
          key={partner.id}
          className="group hover:shadow-xl transition-shadow cursor-pointer"
          onClick={() => onPartnerClick(partner)}
        >
          <CardBody>
            <div className="aspect-square bg-slate-50 rounded-2xl flex items-center justify-center mb-4 p-4 border border-slate-200">
              {partner.logoUrl ? (
                <div className="relative h-full w-full">
                  <Image
                    src={partner.logoUrl}
                    alt={partner.name}
                    fill
                    className="object-contain group-hover:scale-105 transition-transform"
                  />
                </div>
              ) : (
                <div className="text-xs font-bold text-slate-500">Logo</div>
              )}
            </div>

            <div className="text-center">
              <div
                className={[
                  "inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold mb-2",
                  tierBadgeClass(partner.tier),
                ].join(" ")}
              >
                {tierLabel(partner.tier)}
              </div>
              <div className="font-extrabold text-lg mb-2 text-slate-950">{partner.name}</div>
              <div className="text-sm text-slate-600 line-clamp-2 mb-3">{partner.description}</div>

              <div className="flex justify-center gap-3 text-xs font-semibold text-slate-500">
                {partner.videoUrl ? (
                  <span className="flex items-center gap-1">
                    <Play className="size-3" /> Video
                  </span>
                ) : null}
                {partner.websiteUrl ? (
                  <span className="flex items-center gap-1">
                    <ExternalLink className="size-3" /> Website
                  </span>
                ) : null}
              </div>
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

