import * as admin from "firebase-admin";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";

admin.initializeApp();

const db = admin.firestore();
const STARKS_TIME_ZONE = "America/New_York";

type BirthdayWishType = "birthday" | "belated";

type BirthdayUserDoc = {
  name?: string;
  firstName?: string;
  birthMonth?: number;
  birthDay?: number;
  status?: string;
  suspended?: boolean;
  lastBirthdayWishYear?: number;
  lastBirthdayWishType?: BirthdayWishType;
};

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
  return new Date().getFullYear();
}

function getTodayParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: STARKS_TIME_ZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(now);

  const value = (type: "year" | "month" | "day") =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);

  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
  };
}

function displayDateKey(today = getTodayParts()) {
  return `${today.year}-${String(today.month).padStart(2, "0")}-${String(today.day).padStart(2, "0")}`;
}

function monthDayValue(month?: number, day?: number) {
  return month && day ? month * 100 + day : -1;
}

function getBirthdayState(user: BirthdayUserDoc, today = getTodayParts()) {
  if (user.status !== "approved" || user.suspended === true || !user.birthMonth || !user.birthDay) {
    return { showTodayBirthday: false, belatedEligible: false };
  }

  const todayValue = monthDayValue(today.month, today.day);
  const birthdayValue = monthDayValue(user.birthMonth, user.birthDay);

  return {
    showTodayBirthday: user.birthMonth === today.month && user.birthDay === today.day,
    belatedEligible: birthdayValue >= 0 && birthdayValue < todayValue,
  };
}

async function syncBirthdayWishForUser(uid: string, user: BirthdayUserDoc, today = getTodayParts()) {
  const { showTodayBirthday, belatedEligible } = getBirthdayState(user, today);
  const todayBirthdayId = `auto-birthday-${displayDateKey(today)}-${uid}`;
  const belatedId = `auto-belated-${today.year}-${uid}`;
  const todayBirthdayRef = db.doc(`birthdayWishes/${todayBirthdayId}`);
  const belatedRef = db.doc(`birthdayWishes/${belatedId}`);
  const [todayBirthdaySnap, belatedSnap] = await Promise.all([todayBirthdayRef.get(), belatedRef.get()]);

  let changed = false;
  const firstName = (user.firstName ?? user.name?.trim().split(/\s+/)[0] ?? "Member").trim() || "Member";

  if (showTodayBirthday) {
    if (!todayBirthdaySnap.exists) {
      await todayBirthdayRef.set(
        {
          userId: uid,
          firstName,
          message: `Happy Birthday, ${firstName}!`,
          birthMonth: user.birthMonth,
          birthDay: user.birthDay,
          wishType: "birthday",
          wishYear: today.year,
          displayDateKey: displayDateKey(today),
          postedAt: admin.firestore.FieldValue.serverTimestamp(),
          postedBy: "system",
          source: "automatic",
        },
        { merge: true }
      );
      changed = true;
    }

    if (user.lastBirthdayWishYear !== today.year || user.lastBirthdayWishType !== "birthday") {
      await db.doc(`users/${uid}`).set(
        {
          lastBirthdayWishYear: today.year,
          lastBirthdayWishType: "birthday",
          lastBirthdayWishPostedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      changed = true;
    }
  } else if (todayBirthdaySnap.exists) {
    await todayBirthdayRef.delete();
    changed = true;
  }

  const alreadyBelatedThisYear = user.lastBirthdayWishYear === today.year && user.lastBirthdayWishType === "belated";
  if (belatedEligible && (alreadyBelatedThisYear || user.lastBirthdayWishYear !== today.year)) {
    if (!belatedSnap.exists) {
      await belatedRef.set(
        {
          userId: uid,
          firstName,
          message: `Belated Happy Birthday, ${firstName}!`,
          birthMonth: user.birthMonth,
          birthDay: user.birthDay,
          wishType: "belated",
          wishYear: today.year,
          postedAt: admin.firestore.FieldValue.serverTimestamp(),
          postedBy: "system",
          source: "automatic",
        },
        { merge: true }
      );
      changed = true;
    }

    if (!alreadyBelatedThisYear && user.lastBirthdayWishYear !== today.year) {
      await db.doc(`users/${uid}`).set(
        {
          lastBirthdayWishYear: today.year,
          lastBirthdayWishType: "belated",
          lastBirthdayWishPostedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      changed = true;
    }
  } else if (belatedSnap.exists) {
    await belatedRef.delete();
    changed = true;
  }

  return changed;
}

async function syncAutomaticBirthdayWishes() {
  const today = getTodayParts();
  const todayKey = displayDateKey(today);
  const existingAutomatic = await db.collection("birthdayWishes").where("source", "==", "automatic").get();

  let deleted = 0;
  for (const wishDoc of existingAutomatic.docs) {
    const data = wishDoc.data() as { wishType?: BirthdayWishType; wishYear?: number; displayDateKey?: string };
    const isTodayBirthdayDoc = data.wishType === "birthday" && data.displayDateKey === todayKey;
    const isCurrentYearBelatedDoc = data.wishType === "belated" && data.wishYear === today.year;
    if (isTodayBirthdayDoc || isCurrentYearBelatedDoc) continue;
    await wishDoc.ref.delete();
    deleted += 1;
  }

  const snap = await db.collection("users").where("status", "==", "approved").get();
  let created = 0;
  for (const userDoc of snap.docs) {
    const changed = await syncBirthdayWishForUser(userDoc.id, userDoc.data() as BirthdayUserDoc, today);
    if (changed) created += 1;
  }

  return { created, deleted, scanned: snap.size, year: today.year, month: today.month, day: today.day };
}

export const adminBootstrapAdminClaim = onCall(async (request) => {
  const uid = requireAuth(request);
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

  await admin.firestore().doc(`users/${uid}`).set({ role }, { merge: true });
  await admin.auth().setCustomUserClaims(uid, { admin: role === "admin" });

  return { ok: true };
});

export const adminDeleteAuthUser = onCall(async (request) => {
  requireAuth(request);
  requireAdminClaim(request);
  const uid = String(request.data?.uid ?? "");
  if (!uid) throw new HttpsError("invalid-argument", "uid is required");
  await admin.auth().deleteUser(uid);
  return { ok: true };
});

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
    status: "pending",
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

  await admin.firestore().collection("auditLogs").add({
    action: "create_member_income_transaction",
    performedBy: uid,
    targetId: txRef.id,
    changes: { amount, method, purpose, category, subcategory, description },
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

export const automaticBirthdayWishScheduler = onSchedule(
  { schedule: "every 15 minutes", timeZone: STARKS_TIME_ZONE },
  async () => {
    const result = await syncAutomaticBirthdayWishes();
    console.log("[automaticBirthdayWishScheduler]", result);
  }
);

export const automaticBirthdayWishOnUserWrite = onDocumentWritten("users/{uid}", async (event) => {
  const after = event.data?.after;
  if (!after?.exists) return;
  const user = after.data() as BirthdayUserDoc;
  const changed = await syncBirthdayWishForUser(event.params.uid, user);
  if (changed) {
    console.log("[automaticBirthdayWishOnUserWrite] synced", { uid: event.params.uid });
  }
});

