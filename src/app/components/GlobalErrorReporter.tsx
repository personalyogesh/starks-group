"use client";

import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/ToastProvider";
import { CapturedError, ReportIssueModal } from "@/app/components/ReportIssueModal";
import Button from "@/components/ui/Button";
import { REPORT_ISSUE_EVENT } from "@/lib/reportIssue";

function mapToFriendly(err: any): CapturedError {
  const code = String(err?.code ?? "");
  const msg = String(err?.message ?? "Something went wrong.");

  if (code === "permission-denied") {
    return {
      message: "You don’t have permission to do that yet.",
      code,
      stack: String(err?.stack ?? ""),
    };
  }
  if (code === "failed-precondition") {
    return {
      message: "This feature needs a small configuration update. Please try again in a minute.",
      code,
      stack: String(err?.stack ?? ""),
    };
  }
  if (code === "unauthenticated") {
    return {
      message: "Please log in to continue.",
      code,
      stack: String(err?.stack ?? ""),
    };
  }
  if (code.includes("network") || msg.toLowerCase().includes("network")) {
    return {
      message: "Network issue. Please check your connection and try again.",
      code: code || undefined,
      stack: String(err?.stack ?? ""),
    };
  }

  return {
    message: msg || "Something went wrong.",
    code: code || undefined,
    stack: String(err?.stack ?? ""),
  };
}

export function GlobalErrorReporter() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [lastError, setLastError] = useState<CapturedError | null>(null);

  const shouldShowModal = useMemo(() => open && Boolean(lastError), [open, lastError]);

  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      const err = event.error ?? event;
      const friendly = mapToFriendly(err);
      setLastError(friendly);
      toast({
        kind: "error",
        title: "Something went wrong",
        description: friendly.message,
      });
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      const friendly = mapToFriendly(event.reason);
      setLastError(friendly);
      toast({
        kind: "error",
        title: "Something went wrong",
        description: friendly.message,
      });
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    const onReportIssue = (event: Event) => {
      const ce = event as CustomEvent<any>;
      const detail = ce?.detail ?? {};
      const friendly = mapToFriendly(detail);
      setLastError({
        ...friendly,
        context: detail?.context ?? friendly.context,
      });
      setOpen(true);
    };
    window.addEventListener(REPORT_ISSUE_EVENT, onReportIssue as any);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
      window.removeEventListener(REPORT_ISSUE_EVENT, onReportIssue as any);
    };
  }, [toast]);

  if (!lastError) return null;

  return (
    <>
      <div className="fixed bottom-4 right-4 z-[220] hidden sm:block">
        <Button variant="outline" onClick={() => setOpen(true)}>
          Report issue
        </Button>
      </div>
      <ReportIssueModal open={shouldShowModal} onOpenChange={setOpen} error={lastError} />
    </>
  );
}

