/** User-facing hint when Firestore/Storage return permission errors. */
export function describeFirebasePermissionDenied(err: unknown): string {
  const any = err as { code?: string; message?: string };
  const code = String(any?.code ?? "");
  const msg = String(any?.message ?? "");
  const isPerm =
    code === "permission-denied" ||
    /insufficient permissions/i.test(msg) ||
    /permission-denied/i.test(code);
  if (!isPerm) return msg || "Please try again.";
  return "Firebase rejected the request. Deploy firestore.rules and storage.rules from this repo, ensure your Firestore users document has role \"admin\" (and is not suspended), then sign out and sign back in so your session picks up admin rights. If hero image upload fails, Storage rules must be deployed too; use “Fix Admin Upload Access” on /admin after your role is set.";
}
