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
import { ensureUserDoc, getUser } from "@/lib/firestore";
import { useHydrated } from "@/lib/useHydrated";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { LoginSchema, loginSchema } from "@/lib/validation";
import { LoadingSpinner } from "@/components/LoadingSpinner";

type LoginForm = LoginSchema;

function mapAuthError(err: any): string {
  const code = String(err?.code ?? "");
  if (code === "auth/invalid-credential" || code === "auth/wrong-password") return "Invalid email or password";
  if (code === "auth/user-not-found") return "Account not found";
  if (code === "auth/too-many-requests") return "Too many attempts. Try again later";
  if (code === "auth/network-request-failed") return "Network error. Please try again.";
  if (code === "auth/unauthorized-domain") return "Google sign-in is not enabled for this site yet.";
  if (code === "auth/operation-not-allowed") return "Google sign-in is not enabled in Firebase yet.";
  return err?.message ?? "Login failed";
}

function nameParts(displayName?: string | null) {
  const parts = (displayName ?? "").trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || undefined,
    lastName: parts.slice(1).join(" ") || undefined,
  };
}

export default function LoginPage() {
  const router = useRouter();
  const { currentUser, loading, logout, loginWithGoogle } = useAuth();
  const hydrated = useHydrated();

  const [submitting, setSubmitting] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [lockUntilMs, setLockUntilMs] = useState<number>(0);
  const [failCount, setFailCount] = useState<number>(0);
  const [nowMs, setNowMs] = useState<number>(0);

  // Avoid hydration mismatch: Date.now() differs between server render and client hydration.
  useEffect(() => {
    if (!hydrated) return;
    setNowMs(Date.now());
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    if (!lockUntilMs) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [hydrated, lockUntilMs]);

  const locked = hydrated ? lockUntilMs > nowMs : false;
  const lockSecondsLeft = locked ? Math.ceil((lockUntilMs - nowMs) / 1000) : 0;

  // Auto-redirect if already signed in
  useEffect(() => {
    if (loading) return;
    if (currentUser) {
      router.replace(currentUser.userDoc?.birthMonth && currentUser.userDoc?.birthDay ? "/" : "/profile");
    }
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
      !submitting &&
      !locked,
    [email, password, submitting, locked]
  );

  const onSubmit = async (data: LoginForm) => {
    if (locked) {
      setMsg({ kind: "error", text: `Too many attempts. Please wait ${lockSecondsLeft}s and try again.` });
      return;
    }
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
        const { firstName, lastName } = nameParts(cred.user.displayName);
        await ensureUserDoc(cred.user.uid, {
          name: cred.user.displayName?.trim() || emailLower,
          firstName,
          lastName,
          email: emailLower,
          ...(cred.user.photoURL ? { avatarUrl: cred.user.photoURL } : {}),
          status: "pending",
          role: "member",
          stats: { posts: 0, connections: 0, events: 0, likes: 0 },
        });
        await signOut(auth);
        setMsg({
          kind: "success",
          text: "We restored your incomplete member record. Your account is pending admin approval.",
        });
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
      router.push("/");
      setFailCount(0);
    } catch (err: any) {
      setMsg({ kind: "error", text: mapAuthError(err) });
      // Client-side cooldown to reduce brute-force attempts / accidental hammering.
      setFailCount((prev) => {
        const next = prev + 1;
        // 3+ consecutive failures => short lock, then exponential-ish growth (capped).
        if (next >= 3) {
          const seconds = Math.min(120, 5 * Math.pow(2, Math.min(5, next - 3))); // 5s,10s,20s,40s,80s,120s
          setLockUntilMs(Date.now() + seconds * 1000);
        }
        return next;
      });
    } finally {
      setSubmitting(false);
    }
  };

  async function onGoogle() {
    if (locked) {
      setMsg({ kind: "error", text: `Too many attempts. Please wait ${lockSecondsLeft}s and try again.` });
      return;
    }
    setSubmitting(true);
    setMsg(null);
    try {
      const result = await loginWithGoogle();
      setMsg({ kind: "success", text: "Signed in. Redirecting..." });
      router.push(result.needsBirthday ? "/profile" : "/");
      setFailCount(0);
    } catch (err: any) {
      setMsg({ kind: "error", text: err?.message ?? "Google sign-in failed" });
      setFailCount((prev) => prev + 1);
    } finally {
      setSubmitting(false);
    }
  }

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

  if (loading) return <LoadingSpinner message="Checking your session..." />;

  // Avoid a blank screen if a user is still considered signed in (token refresh / delayed auth change).
  // We'll keep the auto-redirect effect, but always render something.
  if (currentUser) {
    return (
      <div className="flex flex-col items-center gap-6">
        <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white shadow-sm px-8 py-8">
          <div className="text-2xl font-extrabold tracking-tight text-slate-950">You’re already signed in</div>
          <div className="mt-2 text-slate-600">
            Redirecting to the home page… If you meant to switch accounts, sign out first.
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button variant="dark" onClick={() => router.push("/")}>
              Go Home
            </Button>
            <Button variant="outline" onClick={() => router.push("/settings")}>
              Reset Password
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

        <div className="mt-8">
          <Button
            type="button"
            variant="outline"
            className="w-full flex items-center justify-center gap-3 bg-white"
            disabled={!isFirebaseConfigured || submitting || locked}
            onClick={onGoogle}
          >
            <img src="/google.svg" alt="Google" className="h-5 w-5" />
            {locked ? `Try again in ${lockSecondsLeft}s` : "Continue with Google"}
          </Button>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px bg-slate-200 flex-1" />
            <div className="text-sm font-semibold text-slate-500">or</div>
            <div className="h-px bg-slate-200 flex-1" />
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6">
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

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Already signed in on this device? Open <Link href="/settings" className="font-semibold text-blue-600 hover:underline">Settings</Link> to send yourself a password reset email.
          </div>

          <Button type="submit" variant="dark" disabled={!canSubmit} className="w-full py-4 rounded-2xl text-xl">
            {locked ? `Try again in ${lockSecondsLeft}s` : submitting ? "Signing in..." : "Sign In"}
          </Button>

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

