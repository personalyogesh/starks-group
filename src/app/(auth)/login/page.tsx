"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { useForm } from "react-hook-form";

import logo from "@/assets/starks-logo.jpg";
import { auth, isFirebaseConfigured } from "@/lib/firebaseClient";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

type LoginForm = {
  email: string;
  password: string;
};

export default function LoginPage() {
  const router = useRouter();

  const [remember, setRemember] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  // surface auth gating messages (e.g. suspension)
  useEffect(() => {
    try {
      const t = window.localStorage.getItem("starks:authError");
      if (t) {
        window.localStorage.removeItem("starks:authError");
        setMsg({ kind: "error", text: t });
      }
    } catch {
      // ignore
    }
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<LoginForm>({
    defaultValues: { email: "", password: "" },
    mode: "onTouched",
  });

  const email = watch("email");
  const password = watch("password");

  const canSubmit = useMemo(
    () =>
      email.trim().length > 0 &&
      password.trim().length > 0 &&
      isFirebaseConfigured &&
      !submitting,
    [email, password, submitting]
  );

  const onSubmit = async (data: LoginForm) => {
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
      await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
      await signInWithEmailAndPassword(auth, data.email.trim(), data.password);
      setMsg({ kind: "success", text: "Signed in. Redirecting..." });
      router.push("/dashboard");
    } catch (err: any) {
      setMsg({ kind: "error", text: err?.message ?? "Login failed" });
    } finally {
      setSubmitting(false);
    }
  };

  async function forgotPassword() {
    if (!isFirebaseConfigured) {
      setMsg({
        kind: "error",
        text: "Firebase isn’t configured yet. Add NEXT_PUBLIC_FIREBASE_* to .env.local.",
      });
      return;
    }
    if (!email.trim()) {
      setMsg({ kind: "error", text: "Enter your email first, then click “Forgot password?”" });
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setMsg({ kind: "success", text: "Password reset email sent. Check your inbox." });
    } catch (err: any) {
      setMsg({ kind: "error", text: err?.message ?? "Could not send reset email" });
    }
  }

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

        <div className="mt-8 text-2xl text-slate-600">Welcome back to the community</div>
      </div>

      {/* Card */}
      <div className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white shadow-sm px-10 py-10">
        <div className="max-w-xl">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">Sign In</h1>
          <p className="mt-3 text-2xl text-slate-500">
            Enter your credentials to access your account
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

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 grid gap-6">
          <div className="grid gap-3">
            <label className="text-xl font-semibold text-slate-950">Email</label>
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

          <div className="grid gap-3">
            <label className="text-xl font-semibold text-slate-950">Password</label>
            <Input
              className="bg-slate-100 border-slate-100 focus:border-brand-primary"
              placeholder="Enter your password"
              type="password"
              autoComplete="current-password"
              {...register("password", {
                required: "Password is required",
              })}
            />
            {errors.password?.message && (
              <div className="text-sm text-rose-700">{errors.password.message}</div>
            )}
          </div>

          <div className="flex items-center justify-between gap-4">
            <label className="flex items-center gap-3 text-xl text-slate-700 select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-5 w-5 rounded border-slate-300"
              />
              Remember me
            </label>

            <button
              type="button"
              onClick={forgotPassword}
              className="text-xl font-semibold text-blue-600 hover:underline"
            >
              Forgot password?
            </button>
          </div>

          <Button
            type="submit"
            variant="dark"
            disabled={!canSubmit}
            className="w-full py-4 rounded-2xl text-xl"
          >
            {submitting ? "Signing in..." : "Sign In"}
          </Button>

          <div className="flex items-center gap-4 text-slate-500">
            <div className="h-px flex-1 bg-slate-200" />
            <div className="text-lg">Or continue with</div>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              disabled
              className="h-14 rounded-2xl border border-slate-200 bg-white text-slate-900 font-semibold text-lg flex items-center justify-center gap-3 opacity-60 cursor-not-allowed"
              title="Google login coming soon"
            >
              <span className="text-2xl font-black">G</span> Google
            </button>
            <button
              type="button"
              disabled
              className="h-14 rounded-2xl border border-slate-200 bg-white text-slate-900 font-semibold text-lg flex items-center justify-center gap-3 opacity-60 cursor-not-allowed"
              title="GitHub login coming soon"
            >
              <span className="text-2xl font-black">⌂</span> GitHub
            </button>
          </div>

          <div className="text-center text-lg text-slate-600 pt-2">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-extrabold text-blue-600 hover:underline">
              Create Account
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

