"use client";

import { z } from "zod";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const registerSchema = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(2, "First name must be at least 2 characters")
      .regex(/^[A-Za-z]+$/, "First name must be at least 2 characters"),
    lastName: z
      .string()
      .trim()
      .min(2, "Last name must be at least 2 characters")
      .regex(/^[A-Za-z]+$/, "Last name must be at least 2 characters"),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .regex(emailRegex, "Invalid email format"),
    password: z.string().min(5, "Password must be at least 5 characters"),
    confirmPassword: z.string(),
    countryCode: z.string().min(1, "Country code is required"),
    phoneNumber: z
      .string()
      .transform((v) => v.replace(/\D/g, ""))
      .refine((v) => v.length === 10, "Phone number must be 10 digits"),
    // File validation is handled in the component (size/type + preview). Keep in schema for RHF typing.
    avatarFile: z.any().optional(),
    bio: z.string().max(100, "Bio must be 100 characters or less").optional().default(""),
    sportInterest: z.string().min(1, "Select a sport"),
    role: z.string().min(1, "Select a role"),
    agreedToTerms: z.boolean().refine((v) => v === true, "You must agree to the terms"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterSchema = z.infer<typeof registerSchema>;
// Like login/profile, zodResolver uses the *input* type (some fields optional due to defaults/transforms).
export type RegisterSchemaInput = z.input<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().regex(emailRegex, "Invalid email format"),
  password: z.string().min(1, "Password is required"),
  remember: z.boolean().optional().default(true),
});

// IMPORTANT: zodResolver uses the schema *input* type (remember is optional),
// while many forms treat remember as always-present. Export the input type to avoid TS mismatches.
export type LoginSchema = z.input<typeof loginSchema>;

export const profileEditSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(2, "First name must be at least 2 characters")
    .regex(/^[A-Za-z]+$/, "First name must be at least 2 characters"),
  lastName: z
    .string()
    .trim()
    .min(2, "Last name must be at least 2 characters")
    .regex(/^[A-Za-z]+$/, "Last name must be at least 2 characters"),
  bio: z.string().max(100, "Bio must be 100 characters or less").optional().default(""),
  location: z.string().optional().default(""),
  email: z.string().trim().toLowerCase().regex(emailRegex, "Invalid email format"),
  countryCode: z.string().min(1, "Required"),
  phoneNumber: z
    .string()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v.length === 10, "Phone number must be 10 digits"),
  // Use explicit key+value schemas so the input type doesn't degrade to Record<PropertyKey, unknown>.
  sportsInterests: z.record(z.string(), z.boolean()).optional().default({}),
  goals: z.string().optional().default(""),
});

export type ProfileEditSchema = z.input<typeof profileEditSchema>;

