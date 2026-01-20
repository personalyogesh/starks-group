"use client";

import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebaseClient";
import type {
  AuditLogDoc,
  DonationDoc,
  ExpenseCategoryDoc,
  MembershipPaymentDoc,
  TransactionDoc,
} from "@/lib/firestore";

function assertFirebaseConfigured() {
  if (!isFirebaseConfigured) throw new Error("Firebase isn’t configured in this environment.");
}

// Keep local sanitization so callers never accidentally pass `undefined` to Firestore.
function stripUndefined<T>(value: T): T {
  if (value === undefined) return null as any;
  if (value === null) return value;
  if (Array.isArray(value)) return value.filter((v) => v !== undefined).map((v) => stripUndefined(v)) as any;
  if (typeof value === "object") {
    const out: any = {};
    for (const [k, v] of Object.entries(value as any)) {
      if (v === undefined) continue;
      out[k] = stripUndefined(v);
    }
    return out;
  }
  return value;
}

export async function createTransaction(doc: Omit<TransactionDoc, "createdAt">) {
  assertFirebaseConfigured();
  return await addDoc(collection(db, "transactions"), stripUndefined({ ...doc, createdAt: serverTimestamp() }));
}

export async function createMembershipPayment(doc: Omit<MembershipPaymentDoc, "createdAt">) {
  assertFirebaseConfigured();
  return await addDoc(collection(db, "membershipPayments"), stripUndefined({ ...doc, createdAt: serverTimestamp() }));
}

export async function createDonation(doc: Omit<DonationDoc, "createdAt">) {
  assertFirebaseConfigured();
  // NOTE: if /donations is public-read, do NOT store donorEmail here. Prefer donorEmail=null and handle receipts privately.
  return await addDoc(collection(db, "donations"), stripUndefined({ ...doc, createdAt: serverTimestamp() }));
}

export async function createExpenseCategory(doc: Omit<ExpenseCategoryDoc, "createdAt">) {
  assertFirebaseConfigured();
  return await addDoc(collection(db, "expenseCategories"), stripUndefined({ ...doc, createdAt: serverTimestamp() }));
}

export async function writeAuditLog(doc: Omit<AuditLogDoc, "timestamp">) {
  assertFirebaseConfigured();
  return await addDoc(collection(db, "auditLogs"), stripUndefined({ ...doc, timestamp: serverTimestamp() }));
}

