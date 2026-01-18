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
  signOut,
} from "firebase/auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import logo from "@/assets/starks-logo.jpg";
import { auth, isFirebaseConfigured } from "@/lib/firebaseClient";
import { useAuth } from "@/lib/AuthContext";
import { getUser } from "@/lib/firestore";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { LoginSchema, loginSchema } from "@/lib/validation";

type LoginForm = LoginSchema;

function mapAuthError(err: any): string {
  const code = String(err?.code ?? "");
  if (code === "auth/invalid-credential" || code === "auth/wrong-password") return "Invalid email or password";
  if (code === "auth/user-not-found") return "Account not found";
  if (code === "auth/too-many-requests") return "Too many attempts. Try again later";
  if (code === "auth/network-request-failed") return "Network error. Please try again.";
  return err?.message ?? "Login failed";
}

export default function LoginPage() {
  const router = useRouter();
  const { currentUser, loading, logout } = useAuth();

  const [submitting, setSubmitting] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  // Auto-redirect if already signed in
  useEffect(() => {
    if (loading) return;
    if (currentUser) router.replace("/dashboard");
  }, [loading, currentUser, router]);

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
    defaultValues: { email: "", password: "", remember: true },
    mode: "onTouched",
    resolver: zodResolver(loginSchema),
  });

  const email = watch("email");
  const password = watch("password");
  const remember = watch("remember") ?? true;

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

    const emailLower = data.email.trim().toLowerCase();

    setSubmitting(true);
    setMsg(null);
    try {
      await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
      const cred = await signInWithEmailAndPassword(auth, emailLower, data.password);

      // Fetch user profile doc and enforce status rules.
      const doc = await getUser(cred.user.uid);
      if (!doc) {
        await signOut(auth);
        setMsg({ kind: "error", text: "Account not found" });
        return;
      }

      if (doc.suspended) {
        await signOut(auth);
        setMsg({ kind: "error", text: "Your account has been deactivated. Contact admin." });
        return;
      }

      if (doc.status === "pending") {
        await signOut(auth);
        setMsg({ kind: "error", text: "Account pending approval" });
        return;
      }

      if (doc.status === "rejected") {
        await signOut(auth);
        setMsg({ kind: "error", text: "Account has been deactivated" });
        return;
      }

      setMsg({ kind: "success", text: "Signed in. Redirecting..." });
      router.push("/dashboard");
    } catch (err: any) {
      setMsg({ kind: "error", text: mapAuthError(err) });
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
      await sendPasswordResetEmail(auth, email.trim().toLowerCase());
      setMsg({ kind: "success", text: "Password reset email sent. Check your inbox." });
    } catch (err: any) {
      setMsg({ kind: "error", text: mapAuthError(err) });
    }
  }

  if (loading) return <p>Loading...</p>;

  // Avoid a blank screen if a user is still considered signed in (token refresh / delayed auth change).
  // We'll keep the auto-redirect effect, but always render something.
  if (currentUser) {
    return (
      <div className="flex flex-col items-center gap-6">
        <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white shadow-sm px-8 py-8">
          <div className="text-2xl font-extrabold tracking-tight text-slate-950">You’re already signed in</div>
          <div className="mt-2 text-slate-600">
            Redirecting to your dashboard… If you meant to switch accounts, sign out first.
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button variant="dark" onClick={() => router.push("/dashboard")}>
              Go to Dashboard
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                setSubmitting(true);
                try {
                  await logout();
                  router.push("/login");
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              Sign out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Top brand */}
      <div className="text-center">
        <Link
          href="/"
          aria-label="Go to home"
          className="inline-flex items-center justify-center gap-4 hover:opacity-80 transition-opacity"
        >
          <Image
            src={logo}
            alt="Starks Cricket"
            width={76}
            height={76}
            className="rounded-md bg-white p-1 shadow-sm"
          />
          <div className="text-left leading-tight">
            <div className="text-4xl font-extrabold tracking-tight text-brand-deep">Starks Cricket</div>
            <div className="text-2xl text-slate-600">Estd. 2018</div>
          </div>
        </Link>

        <div className="mt-8 text-2xl text-slate-600">Welcome back to the community</div>
      </div>

      {/* Card */}
      <div className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white shadow-sm px-10 py-10">
        <div className="max-w-xl">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">Sign In</h1>
          <p className="mt-3 text-2xl text-slate-500">Enter your credentials to access your account</p>
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
                setValueAs: (v) => String(v ?? "").toLowerCase(),
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: "Invalid email format",
                },
              })}
            />
            {errors.email?.message && <div className="text-sm text-rose-700">{errors.email.message}</div>}
          </div>

          <div className="grid gap-3">
            <label className="text-xl font-semibold text-slate-950">Password</label>
            <div className="relative">
              <Input
                className="bg-slate-100 border-slate-100 focus:border-brand-primary pr-12"
                placeholder="Enter your password"
                type={showPw ? "text" : "password"}
                autoComplete="current-password"
                {...register("password", { required: "Password is required" })}
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-sm font-semibold text-slate-700 hover:text-slate-900"
                onClick={() => setShowPw((v) => !v)}
              >
                {showPw ? "Hide" : "Show"}
              </button>
            </div>
            {errors.password?.message && <div className="text-sm text-rose-700">{errors.password.message}</div>}
          </div>

          <div className="flex items-center justify-between gap-4">
            <label className="flex items-center gap-3 text-xl text-slate-700 select-none">
              <input
                type="checkbox"
                {...register("remember")}
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

          <Button type="submit" variant="dark" disabled={!canSubmit} className="w-full py-4 rounded-2xl text-xl">
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

