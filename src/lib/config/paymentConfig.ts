"use client";

import { doc, getDoc } from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebaseClient";

export type PaymentMethodId = "zelle" | "paypal" | "venmo" | "check";
export type MembershipPlanId = "monthly" | "annual" | "lifetime";

export type PaymentConfig = {
  organization: {
    name: string;
    legalName?: string;
    taxId?: string; // NOTE: don't treat client-side config as secret
    type?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      zip?: string;
    };
  };
  paymentMethods: Record<
    PaymentMethodId,
    {
      // common
      instructions: string;
      processingTime?: string;
      fees?: string;
      // method-specific fields
      email?: string;
      link?: string;
      displayName?: string;
      username?: string;
      payableTo?: string;
      mailTo?: string;
    }
  >;
  membershipPlans: Record<
    MembershipPlanId,
    {
      price: number;
      billingCycle: "month" | "year" | "one-time";
      savings?: number;
      benefits: string[];
      badge?: string;
      description?: string;
    }
  >;
  donationCategories: Array<{ value: string; label: string; description?: string }>;
  security: {
    requireAuthForPaymentInfo: boolean;
    requireMembershipForFullAccess: boolean;
    enablePaymentVerification: boolean;
    sessionTimeout: number; // minutes
  };
};

export const DEFAULT_PAYMENT_CONFIG: PaymentConfig = {
  organization: {
    name: "Starks Group INC",
    legalName: "Starks Group Incorporated",
    taxId: "XX-XXXXXXX",
    type: "501(c)(3) Non-Profit",
    address: { street: "123 Cricket Lane", city: "Your City", state: "CA", zip: "12345" },
  },
  paymentMethods: {
    zelle: {
      email: "starksgroup@starksgrp.org",
      displayName: "Starks Group INC",
      instructions: "Use your bank’s Zelle feature to send payment",
      processingTime: "Instant",
      fees: "Free",
    },
    paypal: {
      email: "starksgroup@starksgrp.org",
      link: "https://paypal.me/starksgroup",
      instructions: "Send payment via PayPal",
      processingTime: "Instant",
      fees: "PayPal fees may apply",
    },
    venmo: {
      username: "@StarksGroup",
      link: "https://venmo.com/StarksGroup",
      instructions: "Send payment via Venmo app",
      processingTime: "Instant",
      fees: "Free for personal accounts",
    },
    check: {
      payableTo: "Starks Group INC",
      mailTo: "123 Cricket Lane, Your City, CA 12345",
      instructions: "Mail check with membership info",
      processingTime: "3-5 business days",
      fees: "Free",
    },
  },
  membershipPlans: {
    monthly: {
      price: 25,
      billingCycle: "month",
      benefits: ["Access to all events", "Community forum access", "Monthly newsletter", "Member-only content"],
      description: "Perfect for trying us out",
    },
    annual: {
      price: 250,
      billingCycle: "year",
      savings: 50,
      benefits: [
        "All monthly benefits",
        "2 months free (save $50)",
        "Priority event registration",
        "Exclusive merchandise discount",
        "Vote in club decisions",
      ],
      badge: "Popular",
      description: "Best value — Save $50!",
    },
    lifetime: {
      price: 1000,
      billingCycle: "one-time",
      savings: 2000,
      benefits: [
        "All annual benefits",
        "Lifetime membership",
        "Founding member badge",
        "Name on honor wall",
        "Lifetime event discounts",
        "Board meeting attendance",
      ],
      badge: "Best Value",
      description: "One-time payment",
    },
  },
  donationCategories: [
    { value: "general", label: "General Fund", description: "Support overall operations" },
    { value: "youth", label: "Youth Programs", description: "Fund youth cricket development" },
    { value: "equipment", label: "Equipment Fund", description: "Purchase cricket equipment" },
    { value: "scholarships", label: "Scholarships", description: "Support player scholarships" },
    { value: "facility", label: "Facility Improvements", description: "Upgrade facilities" },
    { value: "community", label: "Community Outreach", description: "Community programs" },
  ],
  security: {
    requireAuthForPaymentInfo: true,
    requireMembershipForFullAccess: false,
    enablePaymentVerification: true,
    sessionTimeout: 30,
  },
};

// Back-compat with the prompt naming
export const PAYMENT_CONFIG = DEFAULT_PAYMENT_CONFIG;

export function canViewPaymentInfo(user: any, cfg: PaymentConfig = DEFAULT_PAYMENT_CONFIG): boolean {
  if (!cfg.security.requireAuthForPaymentInfo) return true;
  return Boolean(user);
}

export function getAvailablePaymentMethods(user: any, cfg: PaymentConfig = DEFAULT_PAYMENT_CONFIG) {
  if (!canViewPaymentInfo(user, cfg)) return [];
  return (Object.entries(cfg.paymentMethods) as Array<[PaymentMethodId, any]>).map(([id, v]) => ({ id, ...v }));
}

export function maskSensitiveInfo(data: any): any {
  if (!data) return data;
  const masked: any = Array.isArray(data) ? [...data] : { ...data };
  if (masked.email && typeof masked.email === "string") masked.email = masked.email.replace(/(.{3}).*(@.*)/, "$1***$2");
  if (masked.taxId && typeof masked.taxId === "string") masked.taxId = masked.taxId.replace(/\d(?=\d{4})/g, "X");
  return masked;
}

// Loads config from Firestore doc: `paymentConfig/current`
// Rules will enforce signed-in read; guests will get permission-denied and we fallback to safe defaults.
export async function fetchPaymentConfig(): Promise<PaymentConfig> {
  if (!isFirebaseConfigured) return DEFAULT_PAYMENT_CONFIG;
  const ref = doc(db, "paymentConfig", "current");
  const snap = await getDoc(ref);
  if (!snap.exists()) return DEFAULT_PAYMENT_CONFIG;
  return { ...DEFAULT_PAYMENT_CONFIG, ...(snap.data() as any) } as PaymentConfig;
}

