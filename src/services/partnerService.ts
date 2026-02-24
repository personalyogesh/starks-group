import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";

import { db, isFirebaseConfigured } from "@/lib/firebaseClient";

export interface Partner {
  id: string;
  name: string;
  tagline: string;
  description: string;
  logoUrl: string;
  location: string;
  category: string;
  instagramHandle: string;
  instagramUrl: string;
  websiteUrl?: string;
  isFeatured: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

const PARTNERS_COLLECTION = "partners";

function assertFirebaseConfigured() {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase is not configured.");
  }
}

// Get all partners ordered by "order" ascending.
export const getPartners = async (): Promise<Partner[]> => {
  assertFirebaseConfigured();
  try {
    const q = query(collection(db, PARTNERS_COLLECTION), orderBy("order", "asc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<Partner, "id">),
    }));
  } catch (error) {
    console.error("Error fetching partners:", error);
    throw error;
  }
};

// Get one partner by id.
export const getPartner = async (partnerId: string): Promise<Partner | null> => {
  assertFirebaseConfigured();
  try {
    const docRef = doc(db, PARTNERS_COLLECTION, partnerId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return null;

    return {
      id: docSnap.id,
      ...(docSnap.data() as Omit<Partner, "id">),
    };
  } catch (error) {
    console.error("Error fetching partner:", error);
    throw error;
  }
};

// Create partner document and set ISO timestamps.
export const createPartner = async (
  partnerData: Omit<Partner, "id" | "createdAt" | "updatedAt">
): Promise<string> => {
  assertFirebaseConfigured();
  try {
    const now = new Date().toISOString();
    const docRef = await addDoc(collection(db, PARTNERS_COLLECTION), {
      ...partnerData,
      createdAt: now,
      updatedAt: now,
    });
    return docRef.id;
  } catch (error) {
    console.error("Error creating partner:", error);
    throw error;
  }
};

// Update partner document and refresh updatedAt timestamp.
export const updatePartner = async (
  partnerId: string,
  updates: Partial<Omit<Partner, "id" | "createdAt" | "updatedAt">>
): Promise<void> => {
  assertFirebaseConfigured();
  try {
    const docRef = doc(db, PARTNERS_COLLECTION, partnerId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error updating partner:", error);
    throw error;
  }
};

// Delete partner document.
export const deletePartner = async (partnerId: string): Promise<void> => {
  assertFirebaseConfigured();
  try {
    const docRef = doc(db, PARTNERS_COLLECTION, partnerId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error deleting partner:", error);
    throw error;
  }
};

// Return featured partner from ordered partner list.
export const getFeaturedPartner = async (): Promise<Partner | null> => {
  try {
    const partners = await getPartners();
    return partners.find((p) => p.isFeatured) ?? null;
  } catch (error) {
    console.error("Error fetching featured partner:", error);
    throw error;
  }
};
