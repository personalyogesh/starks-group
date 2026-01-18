"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Award,
  ExternalLink,
  Facebook,
  Image as ImageIcon,
  Instagram,
  Linkedin,
  Play,
  Search,
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
import { PartnerCardSkeleton } from "@/app/components/PartnerCardSkeleton";

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

function tierBarClass(tier: PartnerTier) {
  switch (tier) {
    case "platinum":
      return "bg-gradient-to-r from-slate-400 to-slate-600";
    case "gold":
      return "bg-gradient-to-r from-yellow-400 to-yellow-600";
    case "silver":
      return "bg-gradient-to-r from-gray-200 to-gray-400";
    case "bronze":
      return "bg-gradient-to-r from-amber-600 to-amber-800";
    case "community":
      return "bg-gradient-to-r from-emerald-400 to-emerald-600";
    default:
      return "bg-slate-200";
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

  const [searchQuery, setSearchQuery] = useState("");
  const [tierFilter, setTierFilter] = useState<"all" | PartnerTier>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | PartnerType>("all");
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"tier" | "name" | "newest">("tier");

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

  // Filter partners based on search and filters
  const filteredPartners = useMemo(() => {
    const s = searchQuery.trim().toLowerCase();
    const rows = partners.filter((p) => {
      const matchesSearch =
        !s ||
        p.name.toLowerCase().includes(s) ||
        (p.description ?? "").toLowerCase().includes(s) ||
        safeHost(p.websiteUrl).toLowerCase().includes(s);
      const matchesTier = tierFilter === "all" || p.tier === tierFilter;
      const matchesType = typeFilter === "all" || p.type === typeFilter;
      const matchesFeatured = !showFeaturedOnly || p.featured;
      return matchesSearch && matchesTier && matchesType && matchesFeatured;
    });

    // Sort
    if (sortBy === "name") {
      rows.sort((a, b) => String(a.name ?? "").localeCompare(String(b.name ?? ""), undefined, { sensitivity: "base" }));
    } else if (sortBy === "newest") {
      rows.sort((a, b) => {
        const ams = typeof (a.createdAt as any)?.toMillis === "function" ? (a.createdAt as any).toMillis() : new Date(a.createdAt as any).getTime();
        const bms = typeof (b.createdAt as any)?.toMillis === "function" ? (b.createdAt as any).toMillis() : new Date(b.createdAt as any).getTime();
        return (Number.isFinite(bms) ? bms : 0) - (Number.isFinite(ams) ? ams : 0);
      });
    }
    // "tier" is already returned roughly tier-sorted from service; leave as-is.
    return rows;
  }, [partners, searchQuery, tierFilter, typeFilter, showFeaturedOnly, sortBy]);

  const isFiltered = Boolean(
    searchQuery.trim() || tierFilter !== "all" || typeFilter !== "all" || showFeaturedOnly
  );

  function openPartnerDetail(p: Partner) {
    setSelected(p);
    setDetailOpen(true);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-12 md:py-20">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <Award className="size-12 md:size-16 mx-auto mb-4 md:mb-6" />
          <h1 className="text-3xl md:text-5xl font-extrabold mb-3 md:mb-4">Our Partners & Sponsors</h1>
          <p className="text-base md:text-xl max-w-3xl mx-auto text-blue-100">
            We’re grateful for the generous support of our partners who make our mission possible. Together, we’re
            building a stronger cricket community.
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-10 space-y-6">
        {/* Top actions (admin only) */}
        {isAdmin && (
          <div className="flex justify-end">
            <Link href="/admin/partners">
              <Button variant="dark">Manage Partners</Button>
            </Link>
          </div>
        )}

        {/* Search and Filter Section */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6">
          {/* Mobile: Stack */}
          <div className="space-y-3 md:hidden">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-slate-400" />
              <Input
                placeholder="Search partners..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Select value={tierFilter} onChange={(e) => setTierFilter(e.target.value as any)}>
                <option value="all">All tiers</option>
                <option value="platinum">Platinum</option>
                <option value="gold">Gold</option>
                <option value="silver">Silver</option>
                <option value="bronze">Bronze</option>
                <option value="community">Community</option>
              </Select>

              <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)}>
                <option value="all">All types</option>
                <option value="corporate">Corporate</option>
                <option value="nonprofit">Non-Profit</option>
                <option value="individual">Individual</option>
                <option value="media">Media</option>
              </Select>
            </div>

            <label className="flex items-center justify-center gap-2 text-sm font-semibold text-slate-700 select-none pt-1">
              <input
                type="checkbox"
                checked={showFeaturedOnly}
                onChange={(e) => setShowFeaturedOnly(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Show featured only
            </label>
          </div>

          {/* Desktop: Grid */}
          <div className="hidden md:grid md:grid-cols-12 gap-4 items-center">
            <div className="md:col-span-5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-slate-400" />
                <Input
                  placeholder="Search partners by name..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="md:col-span-3">
              <Select value={tierFilter} onChange={(e) => setTierFilter(e.target.value as any)}>
                <option value="all">All tiers</option>
                <option value="platinum">Platinum</option>
                <option value="gold">Gold</option>
                <option value="silver">Silver</option>
                <option value="bronze">Bronze</option>
                <option value="community">Community</option>
              </Select>
            </div>

            <div className="md:col-span-3">
              <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)}>
                <option value="all">All types</option>
                <option value="corporate">Corporate</option>
                <option value="nonprofit">Non-Profit</option>
                <option value="individual">Individual</option>
                <option value="media">Media</option>
              </Select>
            </div>

            <div className="md:col-span-1 flex items-center justify-center">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 select-none">
                <input
                  type="checkbox"
                  checked={showFeaturedOnly}
                  onChange={(e) => setShowFeaturedOnly(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Featured
              </label>
            </div>
          </div>

          {/* Active Filters Display */}
          {(tierFilter !== "all" ||
            typeFilter !== "all" ||
            showFeaturedOnly ||
            Boolean(searchQuery.trim())) && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-200 flex-wrap">
              <span className="text-sm text-slate-600">Active filters:</span>

              {searchQuery.trim() && (
                <FilterPill
                  label={`Search: ${searchQuery.trim()}`}
                  onClear={() => setSearchQuery("")}
                />
              )}
              {tierFilter !== "all" && (
                <FilterPill label={`Tier: ${tierFilter}`} onClear={() => setTierFilter("all")} />
              )}
              {typeFilter !== "all" && (
                <FilterPill label={`Type: ${typeFilter}`} onClear={() => setTypeFilter("all")} />
              )}
              {showFeaturedOnly && (
                <FilterPill label="Featured only" onClear={() => setShowFeaturedOnly(false)} />
              )}

              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setTierFilter("all");
                  setTypeFilter("all");
                  setShowFeaturedOnly(false);
                }}
                className="text-sm text-blue-700 hover:underline ml-auto"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Results Summary */}
        <div className="flex items-start sm:items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl md:text-2xl font-extrabold text-slate-950">
              {filteredPartners.length === partners.length
                ? `All Partners (${partners.length})`
                : `Showing ${filteredPartners.length} of ${partners.length} partners`}
            </h2>
            {(searchQuery.trim() || tierFilter !== "all" || typeFilter !== "all" || showFeaturedOnly) && (
              <p className="text-sm text-slate-600 mt-1">
                Filters applied.{" "}
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setTierFilter("all");
                    setTypeFilter("all");
                    setShowFeaturedOnly(false);
                  }}
                  className="text-blue-700 hover:underline"
                >
                  Clear all filters
                </button>
              </p>
            )}
          </div>

          {/* Sort Options */}
          <div className="flex items-center gap-2">
            <div className="text-sm font-semibold text-slate-700">Sort</div>
            <Select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="bg-white w-[180px]">
              <option value="tier">Sort by Tier</option>
              <option value="name">Sort by Name</option>
              <option value="newest">Newest First</option>
            </Select>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {error}
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <PartnerCardSkeleton key={i} />
            ))}
          </div>
        ) : partners.length === 0 ? (
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
          <PartnerGrid
            partners={filteredPartners}
            onPartnerClick={openPartnerDetail}
            isFiltered={isFiltered}
            onClearFilters={() => {
              setSearchQuery("");
              setTierFilter("all");
              setTypeFilter("all");
              setShowFeaturedOnly(false);
            }}
          />
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
  isFiltered = false,
  onClearFilters,
}: {
  partners: Partner[];
  onPartnerClick: (partner: Partner) => void;
  isFiltered?: boolean;
  onClearFilters?: () => void;
}) {
  if (partners.length === 0) {
    return (
      <Card className="border-2 border-dashed border-slate-200 bg-white">
        <CardBody>
          <div className="p-6 md:p-12 text-center">
            {isFiltered ? (
              <>
                <Search className="size-14 mx-auto text-slate-300 mb-4" />
                <h3 className="text-xl font-extrabold text-slate-900 mb-2">No partners found</h3>
                <p className="text-slate-600 mb-5">
                  Try adjusting your filters or search terms to find what you&apos;re looking for.
                </p>
                {onClearFilters ? (
                  <Button variant="outline" onClick={onClearFilters}>
                    Clear filters
                  </Button>
                ) : null}
              </>
            ) : (
              <>
                <Award className="size-14 mx-auto text-slate-300 mb-4" />
                <h3 className="text-xl font-extrabold text-slate-900 mb-2">No partners here yet</h3>
                <p className="text-slate-600">Check back soon for new partnerships!</p>
              </>
            )}
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
      {partners.map((partner) => (
        <Card
          key={partner.id}
          className="group hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden border-2 border-transparent hover:border-blue-200"
          onClick={() => onPartnerClick(partner)}
        >
          <div className="p-0">
            {/* Tier Banner */}
            <div className={[tierBarClass(partner.tier), "h-2"].join(" ")} />

            {/* Logo Section */}
            <div className="aspect-square bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-8 relative">
              {partner.logoUrl ? (
                <div className="relative h-full w-full">
                  <Image
                    src={partner.logoUrl}
                    alt={partner.name}
                    fill
                    className="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform duration-300"
                  />
                </div>
              ) : (
                <div className="text-xs font-bold text-slate-500">Logo</div>
              )}

              {partner.featured && (
                <div className="absolute top-3 right-3 inline-flex items-center rounded-full bg-yellow-500 px-3 py-1 text-xs font-extrabold text-white">
                  <Award className="size-3 mr-1" />
                  Featured
                </div>
              )}
            </div>

            {/* Partner Info */}
            <div className="p-5">
              <div className="flex items-center justify-between gap-3 mb-3">
                <span
                  className={[
                    tierBadgeClass(partner.tier),
                    "inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold",
                  ].join(" ")}
                >
                  {tierLabel(partner.tier)}
                </span>
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 capitalize">
                  {partner.type}
                </span>
              </div>

              <h3 className="font-extrabold text-lg mb-2 group-hover:text-blue-700 transition-colors line-clamp-1">
                {partner.name}
              </h3>

              <p className="text-sm text-slate-600 line-clamp-2 mb-4 min-h-[40px]">{partner.description}</p>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500">
                <div className="flex gap-3">
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
                  {partner.galleryImages?.length ? (
                    <span className="flex items-center gap-1">
                      <ImageIcon className="size-3" /> {partner.galleryImages.length} photos
                    </span>
                  ) : null}
                </div>
                {partner.partnerSince ? <span className="text-slate-400">Since {partner.partnerSince}</span> : <span />}
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function FilterPill({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-800">
      {label}
      <button
        type="button"
        onClick={onClear}
        className="h-5 w-5 rounded-full bg-white/70 hover:bg-white grid place-items-center text-slate-700"
        aria-label={`Clear ${label}`}
      >
        ×
      </button>
    </span>
  );
}
