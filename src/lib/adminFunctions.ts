"use client";

import { httpsCallable } from "firebase/functions";

import { functions, isFirebaseConfigured } from "@/lib/firebaseClient";

/**
 * Calls a callable Cloud Function that must be implemented server-side using the Admin SDK.
 *
 * Expected function name: `adminDeleteAuthUser`
 * Payload: { uid: string }
 *
 * Server function should verify the caller is an admin (e.g. via custom claims or Firestore role).
 */
export async function adminDeleteAuthUser(uid: string) {
  if (!isFirebaseConfigured || !functions) {
    throw new Error("Firebase Functions isn't configured.");
  }
  const fn = httpsCallable<{ uid: string }, { ok: true }>(functions, "adminDeleteAuthUser");
  await fn({ uid });
}
