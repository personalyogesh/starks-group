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

function getCurrentFiscalYear(): number {
  // Starks fiscal year = calendar year Jan 1 → Dec 31
  return new Date().getFullYear();
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

// Members record a payment they made (PayPal/Zelle/Venmo/etc).
// This creates a `transactions` doc server-side (Admin SDK), so it will show up in the admin financial dashboard.
export const createMemberIncomeTransaction = onCall(async (request) => {
  const uid = requireAuth(request);
  const data = request.data ?? {};

  const amount = Number(data.amount ?? 0);
  const method = String(data.method ?? "");
  const purpose = String(data.purpose ?? "");
  const category = String(data.category ?? "");
  const subcategory = data.subcategory != null ? String(data.subcategory) : null;
  const description = String(data.description ?? "");
  const payerName = String(data.payerName ?? "");

  if (!amount || amount <= 0) throw new HttpsError("invalid-argument", "amount must be > 0");
  if (!["paypal", "zelle", "venmo", "check", "cash"].includes(method)) {
    throw new HttpsError("invalid-argument", "invalid method");
  }
  if (!["membership", "donation", "event_fee", "sponsor"].includes(purpose)) {
    throw new HttpsError("invalid-argument", "invalid purpose");
  }
  if (!category) throw new HttpsError("invalid-argument", "category is required");
  if (!description) throw new HttpsError("invalid-argument", "description is required");

  // Load user email if available (transactions are admin-only readable except the payer).
  const user = await admin.auth().getUser(uid).catch(() => null);
  const payerEmail = user?.email ?? null;

  const now = admin.firestore.FieldValue.serverTimestamp();
  const fiscalYear = getCurrentFiscalYear();

  const txRef = await admin.firestore().collection("transactions").add({
    type: "income",
    category,
    subcategory,
    amount,
    method,
    status: "pending", // always pending until admin confirms
    description,
    payerId: uid,
    payerName: payerName || null,
    payerEmail,
    purpose,
    receiptUrl: null,
    notes: null,
    fiscalYear,
    createdAt: now,
    createdBy: uid,
    approvedBy: null,
    approvedAt: null,
    metadata: data.metadata ?? null,
  });

  // Optional audit log (admin-only readable in rules)
  await admin.firestore().collection("auditLogs").add({
    action: "create_member_income_transaction",
    performedBy: uid,
    targetId: txRef.id,
    changes: {
      amount,
      method,
      purpose,
      category,
      subcategory,
      description,
    },
    ipAddress: "N/A",
    timestamp: now,
  });

  return { ok: true, transactionId: txRef.id };
});
