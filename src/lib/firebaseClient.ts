import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Object.values(firebaseConfig).every(Boolean);

export function getFirebaseStorageBucketTroubleshootingMessage(): string | null {
  const bucket = firebaseConfig.storageBucket;
  if (!bucket) return null;
  const looksSuspicious =
    bucket.startsWith("http") ||
    bucket.endsWith(".web.app") ||
    bucket.endsWith(".firebaseapp.com");
  if (!looksSuspicious) return null;
  return (
    `Firebase Storage bucket looks misconfigured (NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="${bucket}"). ` +
    `In Firebase Console → Project settings → Your apps → firebaseConfig, ` +
    `storageBucket often looks like "<projectId>.appspot.com" (or sometimes "<projectId>.firebasestorage.app"). ` +
    `Update .env.local and restart the dev server.`
  );
}

export function isFirebaseStorageBucketLikelyMisconfigured(): boolean {
  return Boolean(getFirebaseStorageBucketTroubleshootingMessage());
}

const app =
  isFirebaseConfigured && (getApps().length ? getApp() : initializeApp(firebaseConfig));

function isLikelySafariOrIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(ua);
  const isSafari = ua.includes("safari") && !ua.includes("chrome") && !ua.includes("crios") && !ua.includes("android");
  return isIOS || isSafari;
}

const shouldForceLongPolling =
  // Opt-in via env for prod if needed, and default-on in dev / iOS Safari to reduce flaky Firestore internal errors.
  process.env.NEXT_PUBLIC_FIREBASE_FORCE_LONG_POLLING === "true" ||
  process.env.NODE_ENV === "development" ||
  isLikelySafariOrIOS();

// Keep these exports typed as non-null so Firebase helpers (doc/collection/etc) typecheck cleanly.
// Guard runtime usage with `isFirebaseConfigured` in UI/components.
export const auth = app ? getAuth(app) : (null as any);
export const db = (() => {
  if (!app) return null as any;
  // Long-polling is slower but tends to be more robust in iOS/Safari and certain environments.
  // Use auto-detect always; force only when we know it helps.
  try {
    return initializeFirestore(app, {
      experimentalAutoDetectLongPolling: true,
      ...(shouldForceLongPolling ? { experimentalForceLongPolling: true } : {}),
    } as any);
  } catch {
    return getFirestore(app);
  }
})();
export const storage = app ? getStorage(app) : (null as any);
export const functions = app ? getFunctions(app) : (null as any);

