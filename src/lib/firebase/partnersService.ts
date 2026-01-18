"use client";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";

import { db, isFirebaseConfigured, storage } from "@/lib/firebaseClient";

export type PartnerTier = "platinum" | "gold" | "silver" | "bronze" | "community";
export type PartnerType = "corporate" | "nonprofit" | "individual" | "media";

export interface Partner {
  id: string;
  name: string;
  description: string;
  logoUrl: string;
  websiteUrl?: string;
  tier: PartnerTier;
  type: PartnerType;
  featured: boolean;

  // Optional content
  videoUrl?: string;
  galleryImages?: string[];
  socialMedia?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
  };

  donationAmount?: number;
  partnerSince?: string;

  // Metadata
  createdAt: any;
  updatedAt: any;
  createdBy: string;

  // Internal: storage paths for safe deletion
  logoStoragePath?: string;
  galleryStoragePaths?: string[];
}

function assertFirebase() {
  if (!isFirebaseConfigured) throw new Error("Firebase isn’t configured.");
}

export async function getAllPartners(): Promise<Partner[]> {
  assertFirebase();
  const q = query(collection(db, "partners"), orderBy("tier", "asc"), orderBy("name", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Partner, "id">) })) as Partner[];
}

export async function getFeaturedPartners(): Promise<Partner[]> {
  assertFirebase();
  const q = query(collection(db, "partners"), where("featured", "==", true), orderBy("tier", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Partner, "id">) })) as Partner[];
}

export async function getPartner(partnerId: string): Promise<Partner | null> {
  assertFirebase();
  const snap = await getDoc(doc(db, "partners", partnerId));
  return snap.exists() ? ({ id: snap.id, ...(snap.data() as any) } as Partner) : null;
}

function fileIsImage(f: File) {
  return f.type.startsWith("image/");
}

async function uploadPartnerImage(path: string, file: File) {
  const r = ref(storage, path);
  await uploadBytes(r, file, { contentType: file.type || "image/jpeg" });
  const url = await getDownloadURL(r);
  return { url, path };
}

export async function createPartner(args: {
  userId: string;
  partnerData: Omit<Partner, "id" | "createdAt" | "updatedAt" | "createdBy" | "logoUrl"> & { logoUrl?: string };
  logoFile?: File;
  galleryFiles?: File[];
}): Promise<string> {
  assertFirebase();

  let logoUrl = args.partnerData.logoUrl ?? "";
  let logoStoragePath: string | undefined;

  if (args.logoFile) {
    if (!fileIsImage(args.logoFile)) throw new Error("Logo must be an image file.");
    if (args.logoFile.size > 5 * 1024 * 1024) throw new Error("Logo must be less than 5MB.");
    const ext = (args.logoFile.name.split(".").pop() || "png").toLowerCase();
    const storagePath = `partners/logos/${args.userId}/${Date.now()}.${ext}`;
    const up = await uploadPartnerImage(storagePath, args.logoFile);
    logoUrl = up.url;
    logoStoragePath = up.path;
  }

  const galleryImages: string[] = [];
  const galleryStoragePaths: string[] = [];

  if (args.galleryFiles?.length) {
    for (const f of args.galleryFiles) {
      if (!fileIsImage(f)) throw new Error("Gallery images must be image files.");
      if (f.size > 5 * 1024 * 1024) throw new Error("Gallery images must be less than 5MB each.");
      const ext = (f.name.split(".").pop() || "jpg").toLowerCase();
      const storagePath = `partners/gallery/${args.userId}/${Date.now()}-${Math.random()
        .toString(16)
        .slice(2)}.${ext}`;
      const up = await uploadPartnerImage(storagePath, f);
      galleryImages.push(up.url);
      galleryStoragePaths.push(up.path);
    }
  }

  const payload = {
    ...args.partnerData,
    logoUrl,
    galleryImages,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: args.userId,
    ...(logoStoragePath ? { logoStoragePath } : {}),
    ...(galleryStoragePaths.length ? { galleryStoragePaths } : {}),
  };

  const refDoc = await addDoc(collection(db, "partners"), payload);
  return refDoc.id;
}

export async function updatePartner(args: {
  partnerId: string;
  partnerData: Partial<Omit<Partner, "id" | "createdAt" | "createdBy">>;
  logoFile?: File;
  galleryFiles?: File[];
}): Promise<void> {
  assertFirebase();

  const existingSnap = await getDoc(doc(db, "partners", args.partnerId));
  if (!existingSnap.exists()) throw new Error("Partner not found");
  const existing = existingSnap.data() as Partner;

  const updateData: any = {
    ...args.partnerData,
    updatedAt: serverTimestamp(),
  };

  // Replace logo
  if (args.logoFile) {
    if (!fileIsImage(args.logoFile)) throw new Error("Logo must be an image file.");
    if (args.logoFile.size > 5 * 1024 * 1024) throw new Error("Logo must be less than 5MB.");
    const ext = (args.logoFile.name.split(".").pop() || "png").toLowerCase();
    const storagePath = `partners/logos/${existing.createdBy}/${Date.now()}.${ext}`;
    const up = await uploadPartnerImage(storagePath, args.logoFile);
    updateData.logoUrl = up.url;
    updateData.logoStoragePath = up.path;
    if (existing.logoStoragePath) {
      try {
        await deleteObject(ref(storage, existing.logoStoragePath));
      } catch {
        // ignore
      }
    }
  }

  // Replace gallery (simple: overwrite list)
  if (args.galleryFiles?.length) {
    const galleryImages: string[] = [];
    const galleryStoragePaths: string[] = [];
    for (const f of args.galleryFiles) {
      if (!fileIsImage(f)) throw new Error("Gallery images must be image files.");
      if (f.size > 5 * 1024 * 1024) throw new Error("Gallery images must be less than 5MB each.");
      const ext = (f.name.split(".").pop() || "jpg").toLowerCase();
      const storagePath = `partners/gallery/${existing.createdBy}/${Date.now()}-${Math.random()
        .toString(16)
        .slice(2)}.${ext}`;
      const up = await uploadPartnerImage(storagePath, f);
      galleryImages.push(up.url);
      galleryStoragePaths.push(up.path);
    }
    updateData.galleryImages = galleryImages;
    updateData.galleryStoragePaths = galleryStoragePaths;

    // delete old gallery
    if (existing.galleryStoragePaths?.length) {
      for (const p of existing.galleryStoragePaths) {
        try {
          await deleteObject(ref(storage, p));
        } catch {
          // ignore
        }
      }
    }
  }

  await updateDoc(doc(db, "partners", args.partnerId), updateData);
}

export async function deletePartner(partnerId: string): Promise<void> {
  assertFirebase();
  const snap = await getDoc(doc(db, "partners", partnerId));
  if (!snap.exists()) throw new Error("Partner not found");
  const data = snap.data() as Partner;

  if (data.logoStoragePath) {
    try {
      await deleteObject(ref(storage, data.logoStoragePath));
    } catch {
      // ignore
    }
  }
  if (data.galleryStoragePaths?.length) {
    for (const p of data.galleryStoragePaths) {
      try {
        await deleteObject(ref(storage, p));
      } catch {
        // ignore
      }
    }
  }

  await deleteDoc(doc(db, "partners", partnerId));
}

export async function getPartnersByTier(tier: PartnerTier): Promise<Partner[]> {
  assertFirebase();
  const q = query(collection(db, "partners"), where("tier", "==", tier), orderBy("name", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Partner, "id">) })) as Partner[];
}

