"use client";

import { httpsCallable } from "firebase/functions";
import { functions, isFirebaseConfigured } from "@/lib/firebaseClient";

type IssueReportPayload = {
  userEmail?: string | null;
  note?: string;
  pageUrl?: string;
  userAgent?: string;
  screenshotUrl?: string | null;
  error: {
    message: string;
    code?: string;
    stack?: string;
    context?: Record<string, any> | null;
  };
};

export async function submitIssueReport(payload: IssueReportPayload) {
  if (!isFirebaseConfigured || !functions) {
    throw new Error("Firebase Functions isn't configured.");
  }
  const fn = httpsCallable<IssueReportPayload, { ok: boolean; reportId: string }>(functions, "submitIssueReport");
  const result = await fn(payload);
  return result.data;
}
