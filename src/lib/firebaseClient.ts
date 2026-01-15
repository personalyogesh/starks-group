"use client";

import { FirebaseApp, getApp, getApps, initializeApp } from "firebase/app";
import { Auth, getAuth } from "firebase/auth";
import { Firestore, getFirestore } from "firebase/firestore";

function getFirebaseConfig() {
  const cfg = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  return cfg;
}

const cfg = getFirebaseConfig();
export const isFirebaseConfigured = Object.values(cfg).every(Boolean);

export const firebaseApp: FirebaseApp | null = isFirebaseConfigured
  ? getApps().length
    ? getApp()
    : initializeApp(cfg)
  : null;

// NOTE: Typed non-null so callers can use Firebase SDK helpers without TypeScript errors.
// Guard usage with `isFirebaseConfigured` in UI code (like `AuthProvider`).
export const db: Firestore = firebaseApp
  ? getFirestore(firebaseApp)
  : (null as unknown as Firestore);

export const auth: Auth = firebaseApp
  ? getAuth(firebaseApp)
  : (null as unknown as Auth);

