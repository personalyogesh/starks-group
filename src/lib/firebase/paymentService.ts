"use client";

import {
  Timestamp,
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

import { db, functions, isFirebaseConfigured } from "@/lib/firebaseClient";

export type Transaction = {
  id: string;
  type: "income" | "expense";
  category: string;
  subcategory?: string | null;
  amount: number;
  method: "paypal" | "zelle" | "venmo" | "check" | "cash";
  status: "pending" | "completed" | "refunded" | "cancelled";
  description: string;

  // Income specific
  payerId?: string | null;
  payerName?: string | null;
  payerEmail?: string | null;
  purpose?: "membership" | "donation" | "event_fee" | "sponsor" | null;

  // Expense specific
  vendor?: string | null;
  payee?: string | null;
  invoiceNumber?: string | null;

  // Common
  receiptUrl?: string | null;
  notes?: string | null;
  fiscalYear: number;
  createdAt: any;
  createdBy: string;
  approvedBy?: string | null;
  approvedAt?: any;
  metadata?: Record<string, any> | null;
};

export type MembershipPayment = {
  id: string;
  userId: string;
  userName?: string | null;
  membershipType: "annual" | "monthly" | "lifetime";
  amount: number;
  startDate: any;
  endDate: any;
  transactionId?: string | null;
  autoRenew?: boolean;
  status: "active" | "expired" | "cancelled";
  createdAt: any;
};

export type Donation = {
  id: string;
  donorId?: string | null;
  donorName?: string | null;
  // NOTE: by default our `donations` collection is public-read; do NOT store email here.
  donorEmail?: null;
  amount: number;
  isAnonymous?: boolean;
  taxDeductible?: boolean;
  receiptSent?: boolean;
  receiptUrl?: string | null;
  purpose?: string | null;
  transactionId?: string | null;
  createdAt: any;
};

function assertFirebaseConfigured() {
  if (!isFirebaseConfigured) throw new Error("Firebase isn’t configured in this environment.");
}

async function assertFunctionsConfigured() {
  if (!isFirebaseConfigured || !functions) throw new Error("Firebase Functions isn't configured.");
}

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

// Fiscal year (Starks) = calendar year Jan 1 → Dec 31
export function getCurrentFiscalYear(): number {
  return new Date().getFullYear();
}

// --- Transactions ---
// NOTE: in our Firestore rules, `/transactions` is admin-write.
// Use this from admin tools OR via a server-side flow (PayPal webhooks / admin reconciliation).
export async function createIncomeTransaction(
  actorUid: string,
  data: {
    category: string;
    subcategory?: string;
    amount: number;
    method: Transaction["method"];
    description: string;
    payerId?: string;
    payerName?: string;
    payerEmail?: string;
    purpose?: NonNullable<Transaction["purpose"]>;
    notes?: string;
    metadata?: any;
  }
): Promise<string> {
  assertFirebaseConfigured();
  const transaction: Omit<Transaction, "id"> = stripUndefined({
    type: "income",
    category: data.category,
    subcategory: data.subcategory,
    amount: data.amount,
    method: data.method,
    status: data.method === "paypal" ? "completed" : "pending",
    description: data.description,
    payerId: data.payerId ?? null,
    payerName: data.payerName ?? null,
    payerEmail: data.payerEmail ?? null,
    purpose: data.purpose ?? null,
    notes: data.notes ?? null,
    fiscalYear: getCurrentFiscalYear(),
    createdAt: serverTimestamp(),
    createdBy: actorUid,
    metadata: data.metadata ?? null,
  });

  const docRef = await addDoc(collection(db, "transactions"), transaction);
  return docRef.id;
}

export async function createExpenseTransaction(
  actorUid: string,
  data: {
    category: string;
    subcategory?: string;
    amount: number;
    method: Transaction["method"];
    description: string;
    vendor?: string;
    payee?: string;
    invoiceNumber?: string;
    notes?: string;
    receiptUrl?: string;
  }
): Promise<string> {
  assertFirebaseConfigured();
  const transaction: Omit<Transaction, "id"> = stripUndefined({
    type: "expense",
    category: data.category,
    subcategory: data.subcategory,
    amount: data.amount,
    method: data.method,
    status: "pending",
    description: data.description,
    vendor: data.vendor ?? null,
    payee: data.payee ?? null,
    invoiceNumber: data.invoiceNumber ?? null,
    notes: data.notes ?? null,
    receiptUrl: data.receiptUrl ?? null,
    fiscalYear: getCurrentFiscalYear(),
    createdAt: serverTimestamp(),
    createdBy: actorUid,
  });

  const docRef = await addDoc(collection(db, "transactions"), transaction);
  return docRef.id;
}

// --- Membership payments ---
// NOTE: `/membershipPayments` allows user create for themselves in rules.
export async function createMembershipPayment(
  userId: string,
  userName: string,
  data: {
    membershipType: MembershipPayment["membershipType"];
    amount: number;
    method: Transaction["method"];
    autoRenew: boolean;
    transactionId?: string | null; // optional; admin can reconcile later
  }
): Promise<string> {
  assertFirebaseConfigured();

  const startDate = Timestamp.now();
  let endDate: Timestamp;
  switch (data.membershipType) {
    case "monthly":
      endDate = Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
      break;
    case "annual":
      endDate = Timestamp.fromDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000));
      break;
    case "lifetime":
      endDate = Timestamp.fromDate(new Date("2099-12-31"));
      break;
  }

  const payment: Omit<MembershipPayment, "id"> = stripUndefined({
    userId,
    userName,
    membershipType: data.membershipType,
    amount: data.amount,
    startDate,
    endDate,
    transactionId: data.transactionId ?? null,
    autoRenew: data.autoRenew,
    status: "active",
    createdAt: serverTimestamp(),
  });

  const docRef = await addDoc(collection(db, "membershipPayments"), payment);
  return docRef.id;
}

// --- Donations ---
// NOTE: `/donations` is public-read in our rules, so this creates a "public-safe" donation doc (no email).
export async function createDonation(data: {
  donorId?: string;
  donorName?: string;
  donorEmail?: string; // accepted as input but not stored
  amount: number;
  isAnonymous: boolean;
  taxDeductible: boolean;
  purpose: string;
  method: Transaction["method"];
  transactionId?: string | null;
}): Promise<string> {
  assertFirebaseConfigured();

  const donation: Omit<Donation, "id"> = stripUndefined({
    donorId: data.donorId ?? null,
    donorName: data.isAnonymous ? "Anonymous" : (data.donorName ?? null),
    donorEmail: null,
    amount: data.amount,
    isAnonymous: data.isAnonymous,
    taxDeductible: data.taxDeductible,
    receiptSent: false,
    receiptUrl: null,
    purpose: data.purpose,
    transactionId: data.transactionId ?? null,
    createdAt: serverTimestamp(),
  });

  const docRef = await addDoc(collection(db, "donations"), donation);
  return docRef.id;
}

// Admin dashboards / reporting
export async function getMembershipPaymentsAdmin(args?: { max?: number }): Promise<MembershipPayment[]> {
  assertFirebaseConfigured();
  const max = args?.max ?? 200;
  const q = query(collection(db, "membershipPayments"), orderBy("createdAt", "desc"), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as MembershipPayment[];
}

export async function getDonationsAdmin(args?: { max?: number }): Promise<Donation[]> {
  assertFirebaseConfigured();
  const max = args?.max ?? 200;
  const q = query(collection(db, "donations"), orderBy("createdAt", "desc"), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Donation[];
}

// --- Queries / Reporting ---
export async function getTransactions(filters?: {
  type?: "income" | "expense";
  fiscalYear?: number;
  category?: string;
  status?: Transaction["status"];
}): Promise<Transaction[]> {
  assertFirebaseConfigured();

  // NOTE: This will succeed for admins, and for members when results are limited to their own payerId by rules.
  let qAny: any = query(collection(db, "transactions"), orderBy("createdAt", "desc"));

  if (filters?.type) qAny = query(qAny, where("type", "==", filters.type));
  if (filters?.fiscalYear) qAny = query(qAny, where("fiscalYear", "==", filters.fiscalYear));
  if (filters?.category) qAny = query(qAny, where("category", "==", filters.category));
  if (filters?.status) qAny = query(qAny, where("status", "==", filters.status));

  const snapshot = await getDocs(qAny);
  return snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Transaction[];
}

export async function getFinancialSummary(fiscalYear?: number): Promise<{
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  byCategory: Record<string, { income: number; expense: number }>;
}> {
  const year = fiscalYear || getCurrentFiscalYear();
  const transactions = await getTransactions({ fiscalYear: year });

  let totalIncome = 0;
  let totalExpenses = 0;
  const byCategory: Record<string, { income: number; expense: number }> = {};

  transactions.forEach((t) => {
    if (t.status !== "completed" && t.status !== "pending") return;
    if (!byCategory[t.category]) byCategory[t.category] = { income: 0, expense: 0 };
    if (t.type === "income") {
      totalIncome += t.amount;
      byCategory[t.category].income += t.amount;
    } else {
      totalExpenses += t.amount;
      byCategory[t.category].expense += t.amount;
    }
  });

  return {
    totalIncome,
    totalExpenses,
    netIncome: totalIncome - totalExpenses,
    byCategory,
  };
}

// Admin-only (by rules)
export async function approveTransaction(transactionId: string, adminId: string): Promise<void> {
  assertFirebaseConfigured();
  await updateDoc(doc(db, "transactions", transactionId), {
    status: "completed",
    approvedBy: adminId,
    approvedAt: serverTimestamp(),
  });
}

// Creates a transaction server-side (Admin SDK) so members can "record" a payment even though `/transactions` is admin-write only.
export async function createMemberIncomeTransaction(args: {
  amount: number;
  method: Transaction["method"];
  purpose: NonNullable<Transaction["purpose"]>;
  category: string;
  subcategory?: string | null;
  description: string;
  payerName?: string | null;
  metadata?: any;
}): Promise<string> {
  await assertFunctionsConfigured();
  const fn = httpsCallable<
    {
      amount: number;
      method: Transaction["method"];
      purpose: NonNullable<Transaction["purpose"]>;
      category: string;
      subcategory?: string | null;
      description: string;
      payerName?: string | null;
      metadata?: any;
    },
    { ok: true; transactionId: string }
  >(functions, "createMemberIncomeTransaction");

  const res = await fn(stripUndefined(args) as any);
  return String((res.data as any)?.transactionId ?? "");
}

// Export for CPA
export async function exportTransactionsToCSV(fiscalYear: number): Promise<string> {
  const transactions = await getTransactions({ fiscalYear });

  const csvHeaders = [
    "Date",
    "Type",
    "Category",
    "Subcategory",
    "Description",
    "Amount",
    "Method",
    "Status",
    "Payer/Payee",
    "Purpose",
    "Invoice #",
    "Approved By",
    "Notes",
  ].join(",");

  const csvRows = transactions.map((t) => {
    const dateStr =
      typeof t.createdAt?.toDate === "function" ? t.createdAt.toDate().toLocaleDateString() : "";
    const payerPayee = t.type === "income" ? (t.payerName || "") : (t.payee || "");
    const purpose = t.purpose || "";
    const invoice = t.invoiceNumber || "";
    const approvedBy = t.approvedBy || "";
    const notes = t.notes || "";
    return [
      dateStr,
      t.type,
      t.category,
      t.subcategory || "",
      `"${String(t.description ?? "").replaceAll('"', '""')}"`,
      Number(t.amount || 0).toFixed(2),
      t.method,
      t.status,
      `"${String(payerPayee).replaceAll('"', '""')}"`,
      purpose,
      invoice,
      approvedBy,
      `"${String(notes).replaceAll('"', '""')}"`,
    ].join(",");
  });

  return [csvHeaders, ...csvRows].join("\n");
}

// --- PayPal (server-side integration) ---
// We NEVER call PayPal directly from the browser; instead we call our own Next.js route handlers.
export async function createPayPalOrder(input: { amount: number; currency?: string; memo?: string }) {
  const res = await fetch("/api/paypal/create-order", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Failed to create PayPal order.");
  }
  return (await res.json()) as { id: string };
}

export async function capturePayPalOrder(input: { orderId: string }) {
  const res = await fetch("/api/paypal/capture-order", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Failed to capture PayPal order.");
  }
  return (await res.json()) as { id: string; status: string };
}

