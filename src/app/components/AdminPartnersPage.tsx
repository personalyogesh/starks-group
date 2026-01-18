"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/lib/AuthContext";
import { isFirebaseConfigured } from "@/lib/firebaseClient";
import {
  createPartner,
  deletePartner,
  getAllPartners,
  Partner,
  PartnerTier,
  PartnerType,
  updatePartner,
} from "@/lib/firebase/partnersService";
import { LoadingSpinner } from "@/components/LoadingSpinner";

const TIER_OPTIONS: Array<{ value: PartnerTier; label: string }> = [
  { value: "platinum", label: "Platinum" },
  { value: "gold", label: "Gold" },
  { value: "silver", label: "Silver" },
  { value: "bronze", label: "Bronze" },
  { value: "community", label: "Community" },
];

const TYPE_OPTIONS: Array<{ value: PartnerType; label: string }> = [
  { value: "corporate", label: "Corporate" },
  { value: "nonprofit", label: "Nonprofit" },
  { value: "individual", label: "Individual" },
  { value: "media", label: "Media" },
];

type FormState = {
  name: string;
  description: string;
  websiteUrl: string;
  tier: PartnerTier;
  type: PartnerType;
  featured: boolean;
  videoUrl: string;
  partnerSince: string;
  donationAmount: string;
  socialMedia: {
    facebook: string;
    twitter: string;
    instagram: string;
    linkedin: string;
  };
};

function initialForm(): FormState {
  return {
    name: "",
    description: "",
    websiteUrl: "",
    tier: "gold",
    type: "corporate",
    featured: false,
    videoUrl: "",
    partnerSince: "",
    donationAmount: "",
    socialMedia: {
      facebook: "",
      twitter: "",
      instagram: "",
      linkedin: "",
    },
  };
}

export default function AdminPartnersPage() {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const uid = currentUser?.authUser?.uid ?? "";

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Partner[]>([]);
  const [q, setQ] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partner | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<FormState>(initialForm());
  const logoRef = useRef<HTMLInputElement | null>(null);
  const galleryRef = useRef<HTMLInputElement | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);

  async function refresh() {
    setLoading(true);
    try {
      if (!isFirebaseConfigured) {
        setRows([]);
        return;
      }
      const all = await getAllPartners();
      setRows(all);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((p) => p.name.toLowerCase().includes(s) || (p.description ?? "").toLowerCase().includes(s));
  }, [rows, q]);

  function openCreate() {
    setEditing(null);
    setForm(initialForm());
    setLogoFile(null);
    setGalleryFiles([]);
    setModalOpen(true);
  }

  function openEdit(p: Partner) {
    setEditing(p);
    setForm({
      name: p.name ?? "",
      description: p.description ?? "",
      websiteUrl: p.websiteUrl ?? "",
      tier: p.tier,
      type: p.type,
      featured: Boolean(p.featured),
      videoUrl: p.videoUrl ?? "",
      partnerSince: p.partnerSince ?? "",
      donationAmount: typeof p.donationAmount === "number" ? String(p.donationAmount) : "",
      socialMedia: {
        facebook: p.socialMedia?.facebook ?? "",
        twitter: p.socialMedia?.twitter ?? "",
        instagram: p.socialMedia?.instagram ?? "",
        linkedin: p.socialMedia?.linkedin ?? "",
      },
    });
    setLogoFile(null);
    setGalleryFiles([]);
    setModalOpen(true);
  }

  async function save() {
    if (!uid) return;
    if (!isFirebaseConfigured) {
      toast({ kind: "error", title: "Firebase not configured", description: "Set NEXT_PUBLIC_FIREBASE_* env vars." });
      return;
    }
    if (!form.name.trim()) {
      toast({ kind: "error", title: "Missing name", description: "Partner name is required." });
      return;
    }

    setSaving(true);
    try {
      const donationAmount = form.donationAmount.trim() ? Number(form.donationAmount.trim()) : undefined;

      const sm = {
        facebook: form.socialMedia.facebook.trim(),
        twitter: form.socialMedia.twitter.trim(),
        instagram: form.socialMedia.instagram.trim(),
        linkedin: form.socialMedia.linkedin.trim(),
      };
      const socialMedia =
        sm.facebook || sm.twitter || sm.instagram || sm.linkedin
          ? {
              ...(sm.facebook ? { facebook: sm.facebook } : {}),
              ...(sm.twitter ? { twitter: sm.twitter } : {}),
              ...(sm.instagram ? { instagram: sm.instagram } : {}),
              ...(sm.linkedin ? { linkedin: sm.linkedin } : {}),
            }
          : undefined;

      const partnerData: any = {
        name: form.name.trim(),
        description: form.description.trim(),
        websiteUrl: form.websiteUrl.trim() || undefined,
        tier: form.tier,
        type: form.type,
        featured: Boolean(form.featured),
        videoUrl: form.videoUrl.trim() || undefined,
        partnerSince: form.partnerSince.trim() || undefined,
        donationAmount: Number.isFinite(donationAmount as any) ? donationAmount : undefined,
        socialMedia,
      };

      if (editing) {
        await updatePartner({
          partnerId: editing.id,
          partnerData,
          logoFile: logoFile ?? undefined,
          galleryFiles: galleryFiles.length ? galleryFiles : undefined,
        });
        toast({ kind: "success", title: "Partner updated", description: "Changes saved." });
      } else {
        await createPartner({
          userId: uid,
          partnerData: { ...partnerData, logoUrl: "" },
          logoFile: logoFile ?? undefined,
          galleryFiles: galleryFiles.length ? galleryFiles : undefined,
        });
        toast({ kind: "success", title: "Partner created", description: "New partner added." });
      }

      setModalOpen(false);
      await refresh();
    } catch (e: any) {
      toast({ kind: "error", title: "Save failed", description: e?.message ?? "Failed to save partner." });
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(p: Partner) {
    if (!confirm(`Delete partner "${p.name}"?`)) return;
    try {
      await deletePartner(p.id);
      toast({ kind: "success", title: "Deleted", description: "Partner removed." });
      await refresh();
    } catch (e: any) {
      toast({ kind: "error", title: "Delete failed", description: e?.message ?? "Failed to delete partner." });
    }
  }

  if (loading) return <LoadingSpinner message="Loading partners..." />;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">Partners Admin</h1>
          <p className="mt-2 text-slate-600">Add, edit, and feature sponsors/partners shown publicly.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/partners">
            <Button variant="outline">View Public Page</Button>
          </Link>
          <Button variant="dark" onClick={openCreate}>
            Add Partner
          </Button>
        </div>
      </div>

      <Card>
        <CardBody>
          <div className="flex flex-wrap items-center gap-3">
            <Input
              className="bg-slate-50 border-slate-200 w-[320px]"
              placeholder="Search partners…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <div className="text-sm text-slate-600">
              {filtered.length} / {rows.length}
            </div>
          </div>
        </CardBody>
      </Card>

      {filtered.length === 0 ? (
        <div className="text-slate-600">No partners.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((p) => (
            <Card key={p.id}>
              <CardBody>
                <div className="flex items-start gap-4">
                  <div className="relative h-14 w-14 rounded-2xl overflow-hidden border border-slate-200 bg-white shrink-0">
                    {p.logoUrl ? (
                      <Image src={p.logoUrl} alt={`${p.name} logo`} fill className="object-contain p-2" />
                    ) : (
                      <div className="h-full w-full grid place-items-center text-xs font-bold text-slate-500">Logo</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-slate-950 truncate">{p.name}</div>
                    <div className="mt-1 text-xs font-bold text-slate-500">
                      {p.tier.toUpperCase()} · {p.type}
                      {p.featured ? " · Featured" : ""}
                    </div>
                    <div className="mt-2 text-sm text-slate-700 line-clamp-2">{p.description}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(p)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => onDelete(p)}>
                      Delete
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        title={editing ? "Edit Partner" : "Add Partner"}
        onClose={() => setModalOpen(false)}
        maxWidthClassName="max-w-2xl"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="dark" onClick={save} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        }
      >
        <div className="grid gap-4">
          <div className="grid gap-2">
            <div className="text-sm font-semibold text-slate-900">Name</div>
            <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          </div>
          <div className="grid gap-2">
            <div className="text-sm font-semibold text-slate-900">Description</div>
            <textarea
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary min-h-24"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Short description…"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <div className="text-sm font-semibold text-slate-900">Tier</div>
              <Select value={form.tier} onChange={(e) => setForm((p) => ({ ...p, tier: e.target.value as any }))}>
                {TIER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid gap-2">
              <div className="text-sm font-semibold text-slate-900">Type</div>
              <Select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as any }))}>
                {TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <div className="text-sm font-semibold text-slate-900">Website URL (optional)</div>
              <Input
                value={form.websiteUrl}
                onChange={(e) => setForm((p) => ({ ...p, websiteUrl: e.target.value }))}
                placeholder="https://example.org"
              />
            </div>
            <div className="grid gap-2">
              <div className="text-sm font-semibold text-slate-900">Video URL (optional)</div>
              <Input
                value={form.videoUrl}
                onChange={(e) => setForm((p) => ({ ...p, videoUrl: e.target.value }))}
                placeholder="https://youtube.com/…"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <div className="text-sm font-semibold text-slate-900">Social links (optional)</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                value={form.socialMedia.facebook}
                onChange={(e) =>
                  setForm((p) => ({ ...p, socialMedia: { ...p.socialMedia, facebook: e.target.value } }))
                }
                placeholder="Facebook URL"
              />
              <Input
                value={form.socialMedia.twitter}
                onChange={(e) =>
                  setForm((p) => ({ ...p, socialMedia: { ...p.socialMedia, twitter: e.target.value } }))
                }
                placeholder="X / Twitter URL"
              />
              <Input
                value={form.socialMedia.instagram}
                onChange={(e) =>
                  setForm((p) => ({ ...p, socialMedia: { ...p.socialMedia, instagram: e.target.value } }))
                }
                placeholder="Instagram URL"
              />
              <Input
                value={form.socialMedia.linkedin}
                onChange={(e) =>
                  setForm((p) => ({ ...p, socialMedia: { ...p.socialMedia, linkedin: e.target.value } }))
                }
                placeholder="LinkedIn URL"
              />
            </div>
            <div className="text-xs text-slate-600">Tip: paste full URLs (e.g. https://instagram.com/...).</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <div className="text-sm font-semibold text-slate-900">Partner Since (optional)</div>
              <Input value={form.partnerSince} onChange={(e) => setForm((p) => ({ ...p, partnerSince: e.target.value }))} placeholder="2018" />
            </div>
            <div className="grid gap-2">
              <div className="text-sm font-semibold text-slate-900">Donation Amount (optional)</div>
              <Input value={form.donationAmount} onChange={(e) => setForm((p) => ({ ...p, donationAmount: e.target.value }))} placeholder="1000" />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm font-semibold text-slate-800 select-none">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(e) => setForm((p) => ({ ...p, featured: e.target.checked }))}
              className="h-4 w-4 rounded border-slate-300"
            />
            Featured (shows on landing page)
          </label>

          <div className="grid gap-2">
            <div className="text-sm font-semibold text-slate-900">Logo (optional)</div>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" type="button" onClick={() => logoRef.current?.click()}>
                Choose logo
              </Button>
              <div className="text-xs text-slate-600">PNG/JPG, max 5MB</div>
              {logoFile && <div className="text-xs font-semibold text-slate-800">{logoFile.name}</div>}
              <input
                ref={logoRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <div className="text-sm font-semibold text-slate-900">Gallery Images (optional)</div>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" type="button" onClick={() => galleryRef.current?.click()}>
                Choose images
              </Button>
              <div className="text-xs text-slate-600">Up to 6 images, max 5MB each</div>
              {galleryFiles.length > 0 && <div className="text-xs font-semibold text-slate-800">{galleryFiles.length} selected</div>}
              <input
                ref={galleryRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => setGalleryFiles(Array.from(e.target.files ?? []).slice(0, 6))}
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

