import { initializeApp, getApps, getApp } from "firebase/app";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  getAuth,
  indexedDBLocalPersistence,
  initializeAuth,
} from "firebase/auth";
import { getFirestore, initializeFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";
import "firebase/auth";
import "firebase/firestore";
import "firebase/storage";
import "firebase/functions";

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

const isBrowser = typeof window !== "undefined";

function getGlobalCache() {
  return globalThis as typeof globalThis & {
    __starksFirebaseApp?: ReturnType<typeof initializeApp>;
    __starksFirebaseAuth?: ReturnType<typeof getAuth>;
    __starksFirebaseDb?: ReturnType<typeof getFirestore>;
    __starksFirebaseStorage?: ReturnType<typeof getStorage>;
    __starksFirebaseFunctions?: ReturnType<typeof getFunctions>;
  };
}

export function getClientApp() {
  if (!isBrowser || !isFirebaseConfigured) return null as any;
  const g = getGlobalCache();
  if (g.__starksFirebaseApp) return g.__starksFirebaseApp;
  try {
    const instance = getApps().length ? getApp() : initializeApp(firebaseConfig);
    g.__starksFirebaseApp = instance;
    return instance;
  } catch {
    return null as any;
  }
}

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
export function getClientAuth() {
  const app = getClientApp();
  if (!app || !isBrowser) return null as any;
  const g = getGlobalCache();
  if (g.__starksFirebaseAuth) return g.__starksFirebaseAuth;
  try {
    const instance = initializeAuth(app, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence],
    });
    g.__starksFirebaseAuth = instance;
    return instance;
  } catch {
    try {
      const instance = getAuth(app);
      g.__starksFirebaseAuth = instance;
      return instance;
    } catch {
      return null as any;
    }
  }
}

export function getClientDb() {
  const app = getClientApp();
  if (!app || !isBrowser) return null as any;
  const g = getGlobalCache();
  if (g.__starksFirebaseDb) return g.__starksFirebaseDb;
  // Long-polling is slower but tends to be more robust in iOS/Safari and certain environments.
  // Use auto-detect always; force only when we know it helps.
  try {
    const instance = initializeFirestore(app, {
      experimentalAutoDetectLongPolling: true,
      ...(shouldForceLongPolling ? { experimentalForceLongPolling: true } : {}),
    } as any);
    g.__starksFirebaseDb = instance;
    return instance;
  } catch {
    try {
      const instance = getFirestore(app);
      g.__starksFirebaseDb = instance;
      return instance;
    } catch {
      return null as any;
    }
  }
}
export const db = (() => getClientDb())();

export function getClientStorage() {
  const app = getClientApp();
  if (!app || !isBrowser) return null as any;
  const g = getGlobalCache();
  if (g.__starksFirebaseStorage) return g.__starksFirebaseStorage;
  try {
    const instance = getStorage(app);
    g.__starksFirebaseStorage = instance;
    return instance;
  } catch {
    return null as any;
  }
}
export const storage = (() => getClientStorage())();

export function getClientFunctions() {
  const app = getClientApp();
  if (!app || !isBrowser) return null as any;
  const g = getGlobalCache();
  if (g.__starksFirebaseFunctions) return g.__starksFirebaseFunctions;
  try {
    const instance = getFunctions(app);
    g.__starksFirebaseFunctions = instance;
    return instance;
  } catch {
    return null as any;
  }
}
export const functions = (() => getClientFunctions())();

