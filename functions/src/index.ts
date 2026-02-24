import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import sgMail from "@sendgrid/mail";
import { defineSecret } from "firebase-functions/params";

admin.initializeApp();
const sendGridApiKeySecret = defineSecret("SENDGRID_API_KEY");

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

export const submitIssueReport = onCall(async (request) => {
  const data = request.data ?? {};
  const userEmail = String(data.userEmail ?? "").trim();
  const note = String(data.note ?? "").trim().slice(0, 4000);
  const pageUrl = String(data.pageUrl ?? "").slice(0, 1000);
  const userAgent = String(data.userAgent ?? "").slice(0, 1000);
  const screenshotUrl = data.screenshotUrl ? String(data.screenshotUrl).slice(0, 2000) : null;
  const error = {
    message: String(data.error?.message ?? "Unknown error").slice(0, 4000),
    code: data.error?.code ? String(data.error.code).slice(0, 200) : null,
    stack: data.error?.stack ? String(data.error.stack).slice(0, 20000) : null,
    context: data.error?.context ?? null,
  };

  if (!error.message) {
    throw new HttpsError("invalid-argument", "Missing error message.");
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  const reportRef = await admin.firestore().collection("issueReports").add({
    createdAt: now,
    uid: request.auth?.uid ?? null,
    email: userEmail || request.auth?.token?.email || null,
    pageUrl: pageUrl || null,
    userAgent: userAgent || null,
    error,
    note: note || null,
    screenshotUrl,
    status: "new",
    source: "cloud-function",
  });

  return { ok: true, reportId: reportRef.id };
});

export const sendFinanceNotifications = onCall({ secrets: [sendGridApiKeySecret] }, async (request) => {
  const uid = requireAuth(request);
  requireAdminClaim(request);

  const data = request.data ?? {};
  const template = String(data.template ?? "custom");
  const recipients = Array.isArray(data.recipients) ? data.recipients : [];
  if (!recipients.length) {
    throw new HttpsError("invalid-argument", "recipients are required");
  }
  if (recipients.length > 300) {
    throw new HttpsError("invalid-argument", "Too many recipients in one request");
  }

  const sendGridApiKey = sendGridApiKeySecret.value();
  if (!sendGridApiKey) {
    throw new HttpsError(
      "failed-precondition",
      "SENDGRID_API_KEY is not configured in Cloud Functions environment."
    );
  }

  const fromEmail = process.env.SENDGRID_FROM_EMAIL || "starksgroup@starksgrp.org";
  const fromName = process.env.SENDGRID_FROM_NAME || "Starks Group";
  sgMail.setApiKey(sendGridApiKey);

  const emailTargets = recipients.filter((r: any) => Boolean(r?.sendEmail && r?.email));
  let sent = 0;
  const failures: Array<{ email: string; error: string }> = [];

  for (const row of emailTargets) {
    const toEmail = String(row.email ?? "").trim();
    const toName = String(row.name ?? "").trim();
    const subject = String(row.subject ?? "").trim();
    const message = String(row.message ?? "").trim();
    if (!toEmail || !subject || !message) {
      failures.push({ email: toEmail || "unknown", error: "Missing email/subject/message" });
      continue;
    }

    const html = message
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\n/g, "<br />");

    try {
      await sgMail.send({
        to: toName ? { email: toEmail, name: toName } : toEmail,
        from: { email: fromEmail, name: fromName },
        subject,
        text: message,
        html: `<div style="font-family:Arial,sans-serif;line-height:1.6;">${html}</div>`,
      });
      sent += 1;
    } catch (err: any) {
      failures.push({
        email: toEmail,
        error: String(err?.message ?? "send failed"),
      });
    }
  }

  await admin.firestore().collection("auditLogs").add({
    action: "send_finance_notifications",
    performedBy: uid,
    targetId: null,
    changes: {
      template,
      requestedRecipients: recipients.length,
      emailTargets: emailTargets.length,
      sent,
      failed: failures.length,
    },
    ipAddress: "N/A",
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {
    ok: true,
    sent,
    failed: failures.length,
    failures: failures.slice(0, 25),
  };
});
