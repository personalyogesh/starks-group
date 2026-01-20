"use client";

export type ReportIssuePayload = {
  message: string;
  code?: string;
  stack?: string;
  context?: Record<string, any>;
};

export const REPORT_ISSUE_EVENT = "starks:report-issue";

export function reportIssue(payload: ReportIssuePayload) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(REPORT_ISSUE_EVENT, { detail: payload }));
}

