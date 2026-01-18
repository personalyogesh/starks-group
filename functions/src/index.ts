import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";

admin.initializeApp();

function requireAuth(context: any) {
  if (!context.auth?.uid) throw new HttpsError("unauthenticated", "Login required.");
  return context.auth.uid as string;
}

function requireAdminClaim(context: any) {
  if (context.auth?.token?.admin !== true) {
    throw new HttpsError("permission-denied", "Admin privileges required.");
  }
}

export const adminBootstrapAdminClaim = onCall(async (request) => {
  const uid = requireAuth(request);
  // Bootstrap rule: user must already be marked admin in Firestore.
  // This makes setup simple: set users/{uid}.role = "admin" once (via console),
  // then call this to sync the Auth custom claim for Storage Rules.
  const userSnap = await admin.firestore().doc(`users/${uid}`).get();
  const role = String(userSnap.data()?.role ?? "");
  if (role !== "admin") {
    throw new HttpsError(
      "permission-denied",
      'Not allowed to bootstrap admin. Set your Firestore users/{uid}.role to "admin" first.'
    );
  }

  await admin.auth().setCustomUserClaims(uid, { admin: true });
  return { ok: true };
});

export const adminSetUserRole = onCall(async (request) => {
  requireAuth(request);
  requireAdminClaim(request);

  const uid = String(request.data?.uid ?? "");
  const role = String(request.data?.role ?? "");
  if (!uid) throw new HttpsError("invalid-argument", "uid is required");
  if (!["admin", "member"].includes(role)) throw new HttpsError("invalid-argument", "role must be admin|member");

  // Keep Firestore role + Auth claims in sync
  await admin.firestore().doc(`users/${uid}`).set({ role }, { merge: true });
  await admin.auth().setCustomUserClaims(uid, { admin: role === "admin" });

  return { ok: true };
});

// Keep your existing placeholder name stable
export const adminDeleteAuthUser = onCall(async (request) => {
  requireAuth(request);
  requireAdminClaim(request);
  const uid = String(request.data?.uid ?? "");
  if (!uid) throw new HttpsError("invalid-argument", "uid is required");
  await admin.auth().deleteUser(uid);
  return { ok: true };
});

