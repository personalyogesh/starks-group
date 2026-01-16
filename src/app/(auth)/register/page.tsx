"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import logo from "@/assets/starks-logo.jpg";
import { auth, isFirebaseConfigured } from "@/lib/firebaseClient";
import { ensureUserDoc } from "@/lib/firestore";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";

type RegisterForm = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  sportInterest: string;
  joinAs: string;
  agreedToTerms: boolean;
  wantsUpdates: boolean;
};

export default function RegisterPage() {
  const router = useRouter();

  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterForm>({
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      sportInterest: "",
      joinAs: "",
      agreedToTerms: false,
      wantsUpdates: false,
    },
    mode: "onTouched",
  });

  const firstName = watch("firstName");
  const lastName = watch("lastName");
  const email = watch("email");
  const pw = watch("password");
  const confirmPw = watch("confirmPassword");
  const sportInterest = watch("sportInterest");
  const joinAs = watch("joinAs");
  const agreedToTerms = watch("agreedToTerms");
  const wantsUpdates = watch("wantsUpdates");

  const canSubmit = useMemo(() => {
    if (!isFirebaseConfigured || submitting) return false;
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !pw) return false;
    if (!agreedToTerms) return false;
    if (pw.length < 8) return false;
    if (pw !== confirmPw) return false;
    if (!sportInterest) return false;
    if (!joinAs) return false;
    return true;
  }, [firstName, lastName, email, pw, confirmPw, sportInterest, joinAs, agreedToTerms, submitting]);

  const submit = async (data: RegisterForm) => {
    if (!isFirebaseConfigured) {
      setMsg({
        kind: "error",
        text: "Firebase isn’t configured yet. Add NEXT_PUBLIC_FIREBASE_* to .env.local.",
      });
      return;
    }

    setSubmitting(true);
    setMsg(null);
    try {
      const cred = await createUserWithEmailAndPassword(
        auth,
        data.email.trim(),
        data.password
      );
      await ensureUserDoc(cred.user.uid, {
        name: `${data.firstName.trim()} ${data.lastName.trim()}`.trim(),
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        email: data.email.trim(),
        sportInterest: data.sportInterest,
        joinAs: data.joinAs,
        agreedToTerms: data.agreedToTerms,
        wantsUpdates: data.wantsUpdates,
        status: "pending",
        role: "member",
      });

      setMsg({ kind: "success", text: "Account created! Pending admin approval." });
      router.push("/dashboard");
    } catch (err: any) {
      setMsg({ kind: "error", text: err?.message ?? "Registration failed" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Top brand */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-4">
          <Image
            src={logo}
            alt="Starks Cricket"
            width={76}
            height={76}
            className="rounded-md bg-white p-1 shadow-sm"
          />
          <div className="text-left leading-tight">
            <div className="text-4xl font-extrabold tracking-tight text-brand-deep">
              Starks Cricket
            </div>
            <div className="text-2xl text-slate-600">Estd. 2018</div>
          </div>
        </div>

        <div className="mt-8 text-2xl text-slate-600">Join our community today</div>
      </div>

      {/* Card */}
      <div className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white shadow-sm px-10 py-10">
        <div className="max-w-xl">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">Create Your Account</h1>
          <p className="mt-3 text-2xl text-slate-500">
            Fill in your details to get started
          </p>
        </div>

        {msg && (
          <div
            className={[
              "mt-6 rounded-2xl border px-4 py-3 text-sm",
              msg.kind === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-rose-200 bg-rose-50 text-rose-900",
            ].join(" ")}
          >
            {msg.text}
          </div>
        )}

        <form onSubmit={handleSubmit(submit)} className="mt-8 grid gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="grid gap-3">
              <label className="text-xl font-semibold text-slate-950">First Name</label>
              <Input
                className="bg-slate-100 border-slate-100 focus:border-brand-primary"
                placeholder="John"
                {...register("firstName", { required: "First name is required" })}
              />
              {errors.firstName?.message && (
                <div className="text-sm text-rose-700">{errors.firstName.message}</div>
              )}
            </div>
            <div className="grid gap-3">
              <label className="text-xl font-semibold text-slate-950">Last Name</label>
              <Input
                className="bg-slate-100 border-slate-100 focus:border-brand-primary"
                placeholder="Doe"
                {...register("lastName", { required: "Last name is required" })}
              />
              {errors.lastName?.message && (
                <div className="text-sm text-rose-700">{errors.lastName.message}</div>
              )}
            </div>
          </div>

          <div className="grid gap-3">
            <label className="text-xl font-semibold text-slate-950">Email Address</label>
            <Input
              className="bg-slate-100 border-slate-100 focus:border-brand-primary"
              placeholder="you@example.com"
              type="email"
              autoComplete="email"
              {...register("email", {
                required: "Email is required",
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: "Enter a valid email address",
                },
              })}
            />
            {errors.email?.message && (
              <div className="text-sm text-rose-700">{errors.email.message}</div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="grid gap-3">
              <label className="text-xl font-semibold text-slate-950">Password</label>
              <Input
                className="bg-slate-100 border-slate-100 focus:border-brand-primary"
                placeholder="Min. 8 characters"
                type="password"
                autoComplete="new-password"
                {...register("password", {
                  required: "Password is required",
                  minLength: { value: 8, message: "Password must be at least 8 characters" },
                })}
              />
              {errors.password?.message && (
                <div className="text-sm text-rose-700">{errors.password.message}</div>
              )}
            </div>
            <div className="grid gap-3">
              <label className="text-xl font-semibold text-slate-950">Confirm Password</label>
              <Input
                className="bg-slate-100 border-slate-100 focus:border-brand-primary"
                placeholder="Re-enter password"
                type="password"
                autoComplete="new-password"
                {...register("confirmPassword", {
                  required: "Confirm your password",
                  validate: (v) => v === watch("password") || "Passwords do not match",
                })}
              />
              {errors.confirmPassword?.message && (
                <div className="text-sm text-rose-700">{errors.confirmPassword.message}</div>
              )}
            </div>
          </div>

          <div className="grid gap-3">
            <label className="text-xl font-semibold text-slate-950">Primary Sport Interest</label>
            <Select
              className="bg-slate-100 border-slate-100 focus:border-brand-primary"
              {...register("sportInterest", { required: "Select a sport" })}
            >
              <option value="" disabled>
                Select a sport
              </option>
              <option value="Cricket">Cricket</option>
              <option value="Fitness">Fitness</option>
              <option value="Community">Community</option>
              <option value="Other">Other</option>
            </Select>
            {errors.sportInterest?.message && (
              <div className="text-sm text-rose-700">{errors.sportInterest.message}</div>
            )}
          </div>

          <div className="grid gap-3">
            <label className="text-xl font-semibold text-slate-950">I want to join as</label>
            <Select
              className="bg-slate-100 border-slate-100 focus:border-brand-primary"
              {...register("joinAs", { required: "Select a role" })}
            >
              <option value="" disabled>
                Select your role
              </option>
              <option value="Player">Player</option>
              <option value="Coach">Coach</option>
              <option value="Volunteer">Volunteer</option>
              <option value="Supporter">Supporter</option>
            </Select>
            {errors.joinAs?.message && (
              <div className="text-sm text-rose-700">{errors.joinAs.message}</div>
            )}
          </div>

          <div className="grid gap-4 pt-2">
            <label className="flex items-center gap-3 text-xl text-slate-700 select-none">
              <input
                type="checkbox"
                {...register("agreedToTerms", {
                  required: "Please agree to the Terms of Service and Privacy Policy.",
                })}
                className="h-5 w-5 rounded border-slate-300"
              />
              <span>
                I agree to the{" "}
                <a className="font-extrabold text-blue-600 hover:underline" href="#terms">
                  Terms of Service
                </a>{" "}
                and{" "}
                <a className="font-extrabold text-blue-600 hover:underline" href="#privacy">
                  Privacy Policy
                </a>
              </span>
            </label>
            {errors.agreedToTerms?.message && (
              <div className="text-sm text-rose-700">{errors.agreedToTerms.message}</div>
            )}

            <label className="flex items-center gap-3 text-xl text-slate-700 select-none">
              <input
                type="checkbox"
                {...register("wantsUpdates")}
                className="h-5 w-5 rounded border-slate-300"
              />
              I&apos;d like to receive updates about programs and events
            </label>
          </div>

          <Button
            type="submit"
            variant="dark"
            disabled={!canSubmit}
            className="w-full py-4 rounded-2xl text-xl"
          >
            {submitting ? "Creating..." : "Create Account"}
          </Button>

          <div className="flex items-center gap-4 text-slate-500">
            <div className="h-px flex-1 bg-slate-200" />
            <div className="text-lg">Or sign up with</div>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              disabled
              className="h-14 rounded-2xl border border-slate-200 bg-white text-slate-900 font-semibold text-lg flex items-center justify-center gap-3 opacity-60 cursor-not-allowed"
              title="Google signup coming soon"
            >
              <span className="text-2xl font-black">G</span> Google
            </button>
            <button
              type="button"
              disabled
              className="h-14 rounded-2xl border border-slate-200 bg-white text-slate-900 font-semibold text-lg flex items-center justify-center gap-3 opacity-60 cursor-not-allowed"
              title="GitHub signup coming soon"
            >
              <span className="text-2xl font-black">⌂</span> GitHub
            </button>
          </div>

          <div className="text-center text-lg text-slate-600 pt-2">
            Already have an account?{" "}
            <Link href="/login" className="font-extrabold text-blue-600 hover:underline">
              Sign In
            </Link>
          </div>
        </form>
      </div>

      <Link href="/" className="text-2xl text-slate-500 hover:text-slate-700 transition">
        ← Back to Home
      </Link>
    </div>
  );
}

