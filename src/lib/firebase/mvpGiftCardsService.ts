"use client";

import {
  Timestamp,
  addDoc,
  collection,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from "firebase/firestore";

import { db, isFirebaseConfigured } from "@/lib/firebaseClient";

export type MvpGiftCardDoc = {
  code: string;
  normalizedCode: string;
  playerName: string;
  amount: number;
  seasonYear: number;
  issuedAt: Timestamp | null;
  issuedByUid: string;
  issuedByName: string;
  expiresAt: Timestamp | null;
  redeemed: boolean;
  redeemedAt: Timestamp | null;
  redeemedByUid: string;
  redeemedByEmail: string;
};

function normalizeCode(value: string) {
  return value.trim().toUpperCase();
}

function toTimestamp(value: unknown): Timestamp | null {
  if (value && typeof value === "object" && "toMillis" in value) return value as Timestamp;
  return null;
}

function normalizeGiftCard(id: string, data: Record<string, unknown>) {
  return {
    id,
    data: {
      code: String(data.code ?? ""),
      normalizedCode: String(data.normalizedCode ?? normalizeCode(String(data.code ?? ""))),
      playerName: String(data.playerName ?? ""),
      amount: Number(data.amount ?? 25),
      seasonYear: Number(data.seasonYear ?? 2026),
      issuedAt: toTimestamp(data.issuedAt),
      issuedByUid: String(data.issuedByUid ?? ""),
      issuedByName: String(data.issuedByName ?? ""),
      expiresAt: toTimestamp(data.expiresAt),
      redeemed: Boolean(data.redeemed ?? false),
      redeemedAt: toTimestamp(data.redeemedAt),
      redeemedByUid: String(data.redeemedByUid ?? ""),
      redeemedByEmail: String(data.redeemedByEmail ?? ""),
    } satisfies MvpGiftCardDoc,
  };
}

export async function getMvpGiftCardByCode(code: string): Promise<{ id: string; data: MvpGiftCardDoc } | null> {
  if (!isFirebaseConfigured) return null;
  const normalized = normalizeCode(code);
  if (!normalized) return null;
  const snap = await getDocs(query(collection(db, "mvpGiftCards"), where("normalizedCode", "==", normalized)));
  const first = snap.docs[0];
  if (!first) return null;
  return normalizeGiftCard(first.id, first.data() as Record<string, unknown>);
}

export function subscribeMvpGiftCards(
  cb: (cards: Array<{ id: string; data: MvpGiftCardDoc }>) => void,
  opts?: { onError?: (error: unknown) => void },
) {
  if (!isFirebaseConfigured) {
    cb([]);
    return () => {};
  }

  const q = query(collection(db, "mvpGiftCards"), orderBy("issuedAt", "desc"));
  return onSnapshot(
    q,
    (snap) => {
      cb(snap.docs.map((item) => normalizeGiftCard(item.id, item.data() as Record<string, unknown>)));
    },
    (error) => {
      opts?.onError?.(error);
      cb([]);
    },
  );
}

export async function createMvpGiftCardsBatch(args: {
  playerNames: string[];
  amount: number;
  seasonYear: number;
  issuedByUid: string;
  issuedByName: string;
  expiresAt: Date | null;
}) {
  if (!isFirebaseConfigured) throw new Error("Firebase isn’t configured.");
  const cleanedNames = args.playerNames.map((name) => name.trim()).filter(Boolean);
  if (!cleanedNames.length) throw new Error("Add at least one player name.");

  const existing = await getDocs(query(collection(db, "mvpGiftCards"), where("seasonYear", "==", args.seasonYear)));
  const existingNumbers = new Set<number>();
  existing.docs.forEach((item) => {
    const data = item.data() as Record<string, unknown>;
    const code = String(data.code ?? "");
    const match = code.match(/-(\d{3})$/);
    if (match) existingNumbers.add(Number(match[1]));
  });

  let pointer = 1;
  const createdCodes: string[] = [];
  for (const playerName of cleanedNames) {
    while (existingNumbers.has(pointer)) pointer += 1;
    const seq = String(pointer).padStart(3, "0");
    const code = `HTI-STARKS-${args.seasonYear}-${seq}`;
    existingNumbers.add(pointer);
    pointer += 1;

    await addDoc(collection(db, "mvpGiftCards"), {
      code,
      normalizedCode: normalizeCode(code),
      playerName,
      amount: args.amount,
      seasonYear: args.seasonYear,
      issuedAt: serverTimestamp(),
      issuedByUid: args.issuedByUid,
      issuedByName: args.issuedByName,
      expiresAt: args.expiresAt ? Timestamp.fromDate(args.expiresAt) : null,
      redeemed: false,
      redeemedAt: null,
      redeemedByUid: "",
      redeemedByEmail: "",
    });
    createdCodes.push(code);
  }
  return { created: cleanedNames.length, createdCodes };
}

export async function redeemMvpGiftCard(args: { code: string; byUid: string; byEmail: string }) {
  if (!isFirebaseConfigured) throw new Error("Firebase isn’t configured.");
  const normalized = normalizeCode(args.code);
  if (!normalized) throw new Error("Invalid code.");

  const snap = await getDocs(query(collection(db, "mvpGiftCards"), where("normalizedCode", "==", normalized)));
  const docSnap = snap.docs[0];
  if (!docSnap) throw new Error("Code not found.");

  await runTransaction(db, async (tx) => {
    const fresh = await tx.get(docSnap.ref);
    if (!fresh.exists()) throw new Error("Code not found.");
    const data = fresh.data() as Record<string, unknown>;
    if (Boolean(data.redeemed)) throw new Error("Code already redeemed.");

    const expiresAt = toTimestamp(data.expiresAt);
    if (expiresAt && expiresAt.toMillis() < Date.now()) {
      throw new Error("Code expired.");
    }

    tx.update(docSnap.ref, {
      redeemed: true,
      redeemedAt: serverTimestamp(),
      redeemedByUid: args.byUid,
      redeemedByEmail: args.byEmail,
    });
  });
}
