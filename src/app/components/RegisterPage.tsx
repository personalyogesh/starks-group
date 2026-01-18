"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { fetchSignInMethodsForEmail } from "firebase/auth";

import logo from "@/assets/starks-logo.jpg";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/lib/AuthContext";
import { auth, isFirebaseConfigured } from "@/lib/firebaseClient";
import { RegisterSchemaInput, registerSchema } from "@/lib/validation";

type RegisterForm = RegisterSchemaInput & { avatarFile?: FileList };

function formatPhone(digits: string) {
  const d = digits.replace(/\D/g, "").slice(0, 10);
  const a = d.slice(0, 3);
  const b = d.slice(3, 6);
  const c = d.slice(6, 10);
  if (d.length <= 3) return a;
  if (d.length <= 6) return `(${a}) ${b}`;
  return `(${a}) ${b}-${c}`;
}

function passwordStrength(pw: string): { label: string; pct: number } {
  const s = pw || "";
  let score = 0;
  if (s.length >= 5) score += 1;
  if (s.length >= 8) score += 1;
  if (/[A-Z]/.test(s)) score += 1;
  if (/[0-9]/.test(s)) score += 1;
  if (/[^A-Za-z0-9]/.test(s)) score += 1;
  const pct = Math.min(100, (score / 5) * 100);
  const label = score <= 1 ? "Weak" : score <= 3 ? "Medium" : "Strong";
  return { label, pct };
}

function mapRoleToJoinAs(role: RegisterForm["role"]): string | undefined {
  if (role === "Coach") return "coach";
  if (role === "Volunteer") return "volunteer";
  // Keep our existing semantics: everyone else is effectively a member.
  if (role === "Athlete" || role === "Supporter") return "member";
  return undefined;
}

function mapAuthError(err: any): string {
  const code = String(err?.code ?? "");
  if (code === "auth/email-already-in-use") return "Email already registered";
  if (code === "auth/invalid-email") return "Invalid email format";
  if (code === "auth/weak-password") return "Password must be at least 5 characters";
  return err?.message ?? "Registration failed";
}

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { signup, loginWithGoogle } = useAuth();

  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [emailStatus, setEmailStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<RegisterForm>({
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      countryCode: "+1",
      phoneNumber: "",
      bio: "",
      sportInterest: "",
      role: "",
      agreedToTerms: false,
    },
    mode: "onTouched",
    resolver: zodResolver(registerSchema),
  });

  const pw = watch("password");
  const confirmPw = watch("confirmPassword");
  const bio = watch("bio");
  const phoneNumber = watch("phoneNumber");
  const role = watch("role");
  const email = (watch("email") ?? "").toLowerCase();
  const avatarFile = watch("avatarFile");

  const strength = useMemo(() => passwordStrength(pw), [pw]);

  // Debounced email availability check (500ms)
  useEffect(() => {
    if (!isFirebaseConfigured) return;
    const e = (email ?? "").trim().toLowerCase();
    if (!e) {
      setEmailStatus("idle");
      return;
    }
    if (errors.email?.message) {
      setEmailStatus("idle");
      return;
    }
    setEmailStatus("checking");
    const t = window.setTimeout(async () => {
      try {
        const methods = await fetchSignInMethodsForEmail(auth, e);
        if (methods.length > 0) {
          setEmailStatus("taken");
          setError("email", { type: "validate", message: "Email already registered" });
        } else {
          setEmailStatus("available");
          clearErrors("email");
        }
      } catch {
        // if network check fails, don't block the user
        setEmailStatus("idle");
      }
    }, 500);
    return () => window.clearTimeout(t);
  }, [email, errors.email?.message, setError, clearErrors]);

  // Keep phone stored as digits only, but display as formatted.
  useEffect(() => {
    const digits = (phoneNumber || "").replace(/\D/g, "").slice(0, 10);
    if (digits !== phoneNumber) setValue("phoneNumber", digits, { shouldValidate: true });
  }, [phoneNumber, setValue]);

  useEffect(() => {
    const f = avatarFile?.[0];
    if (!f) {
      setAvatarPreview(null);
      return;
    }
    const url = URL.createObjectURL(f);
    setAvatarPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  const canSubmit = useMemo(() => {
    if (!isFirebaseConfigured) return false;
    if (submitting) return false;
    const e = email.trim();
    if (!e) return false;
    if (!role) return false;
    if (emailStatus === "taken" || emailStatus === "checking") return false;
    return true;
  }, [email, role, submitting, emailStatus]);

  const onSubmit = async (data: RegisterForm) => {
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
      const firstName = data.firstName.trim();
      const lastName = data.lastName.trim();
      const emailLower = data.email.trim().toLowerCase();
      const digits = data.phoneNumber.replace(/\D/g, "");

      const avatar = data.avatarFile?.[0] ?? null;
      if (avatar) {
        const okType = ["image/jpeg", "image/png"].includes(avatar.type);
        if (!okType) throw new Error("Profile picture must be a JPEG or PNG");
        if (avatar.size > 5 * 1024 * 1024) throw new Error("Profile picture must be <= 5MB");
      }

      if (emailStatus === "checking") throw new Error("Checking email availability. Please wait…");
      if (emailStatus === "taken") throw new Error("Email already registered");

      await signup({
        email: emailLower,
        password: data.password,
        firstName,
        lastName,
        countryCode: data.countryCode,
        phoneNumber: digits,
        bio: (data.bio ?? "").trim() || undefined,
        sportInterest: data.sportInterest,
        joinAs: mapRoleToJoinAs(data.role),
        avatarFile: avatar,
        agreedToTerms: data.agreedToTerms,
        wantsUpdates: false,
      });

      setMsg({ kind: "success", text: "Registration successful! Awaiting admin approval." });
      reset();
      setAvatarPreview(null);
      router.push("/login");
    } catch (err: any) {
      const text = mapAuthError(err);
      setMsg({ kind: "error", text });
      toast({ kind: "error", title: "Registration failed", description: text });
    } finally {
      setSubmitting(false);
    }
  };

  async function onGoogleSignup() {
    setSubmitting(true);
    setMsg(null);
    try {
      await loginWithGoogle();
      // Google users remain signed in, but are read-only until admin approval.
      setMsg({ kind: "success", text: "Signed in with Google! Awaiting admin approval." });
      router.push("/dashboard");
    } catch (err: any) {
      const text = err?.message ?? "Google sign-in failed";
      setMsg({ kind: "error", text });
      toast({ kind: "error", title: "Google sign-in failed", description: text });
    } finally {
      setSubmitting(false);
    }
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
        <div className="mt-8 text-2xl text-slate-600">Join our community today</div>
      </div>

      {/* Card */}
      <div className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white shadow-sm px-10 py-10">
        <div className="max-w-xl">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">Create Your Account</h1>
          <p className="mt-3 text-2xl text-slate-500">Fill in your details to get started</p>
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
            disabled={!isFirebaseConfigured || submitting}
            onClick={onGoogleSignup}
          >
            <img src="/google.svg" alt="Google" className="h-5 w-5" />
            Sign up with Google
          </Button>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px bg-slate-200 flex-1" />
            <div className="text-sm font-semibold text-slate-500">or</div>
            <div className="h-px bg-slate-200 flex-1" />
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="grid gap-3">
              <label className="text-xl font-semibold text-slate-950">First Name</label>
              <Input
                className="bg-slate-100 border-slate-100 focus:border-brand-primary"
                placeholder="John"
                {...register("firstName", {
                  required: "First name is required",
                })}
              />
              {errors.firstName?.message && <div className="text-sm text-rose-700">{errors.firstName.message}</div>}
            </div>

            <div className="grid gap-3">
              <label className="text-xl font-semibold text-slate-950">Last Name</label>
              <Input
                className="bg-slate-100 border-slate-100 focus:border-brand-primary"
                placeholder="Doe"
                {...register("lastName", {
                  required: "Last name is required",
                })}
              />
              {errors.lastName?.message && <div className="text-sm text-rose-700">{errors.lastName.message}</div>}
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
                setValueAs: (v) => String(v ?? "").toLowerCase(),
              })}
            />
            <div className="flex items-center gap-2 text-xs mt-1">
              {emailStatus === "checking" && <span className="text-slate-500">Checking availability…</span>}
              {emailStatus === "available" && <span className="text-emerald-700 font-semibold">✓ Available</span>}
              {emailStatus === "taken" && <span className="text-rose-700 font-semibold">✕ Taken</span>}
            </div>
            {errors.email?.message && <div className="text-sm text-rose-700">{errors.email.message}</div>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="grid gap-3">
              <label className="text-xl font-semibold text-slate-950">Password</label>
              <div className="relative">
                <Input
                  className="bg-slate-100 border-slate-100 focus:border-brand-primary pr-12"
                  placeholder="Min. 5 characters"
                  type={showPw ? "text" : "password"}
                  autoComplete="new-password"
                  {...register("password", {
                    required: "Password is required",
                  })}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-sm font-semibold text-slate-700 hover:text-slate-900"
                  onClick={() => setShowPw((v) => !v)}
                >
                  {showPw ? "Hide" : "Show"}
                </button>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-2 flex-1 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className={[
                      "h-full",
                      strength.label === "Weak"
                        ? "bg-rose-500"
                        : strength.label === "Medium"
                        ? "bg-amber-500"
                        : "bg-emerald-500",
                    ].join(" ")}
                    style={{ width: `${strength.pct}%` }}
                  />
                </div>
                <div className="text-xs font-semibold text-slate-600">{strength.label}</div>
              </div>
              {errors.password?.message && <div className="text-sm text-rose-700">{errors.password.message}</div>}
            </div>

            <div className="grid gap-3">
              <label className="text-xl font-semibold text-slate-950">Confirm Password</label>
              <div className="relative">
                <Input
                  className="bg-slate-100 border-slate-100 focus:border-brand-primary pr-12"
                  placeholder="Re-enter password"
                  type={showConfirm ? "text" : "password"}
                  autoComplete="new-password"
                  {...register("confirmPassword", {
                    required: "Confirm Password is required",
                  })}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-sm font-semibold text-slate-700 hover:text-slate-900"
                  onClick={() => setShowConfirm((v) => !v)}
                >
                  {showConfirm ? "Hide" : "Show"}
                </button>
              </div>
              {errors.confirmPassword?.message && (
                <div className="text-sm text-rose-700">{errors.confirmPassword.message}</div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-6">
            <div className="grid gap-3">
              <label className="text-xl font-semibold text-slate-950">Country Code</label>
              <Select
                className="bg-slate-100 border-slate-100 focus:border-brand-primary"
                {...register("countryCode", { required: "Country code is required" })}
              >
                <option value="+1">+1 (USA)</option>
                <option value="+91">+91 (India)</option>
                <option value="+44">+44 (UK)</option>
                <option value="+61">+61 (Australia)</option>
                <option value="+27">+27 (South Africa)</option>
                <option value="+64">+64 (New Zealand)</option>
              </Select>
              {errors.countryCode?.message && (
                <div className="text-sm text-rose-700">{errors.countryCode.message}</div>
              )}
            </div>
            <div className="grid gap-3">
              <label className="text-xl font-semibold text-slate-950">Phone Number</label>
              <Input
                className="bg-slate-100 border-slate-100 focus:border-brand-primary"
                placeholder="(555) 123-4567"
                inputMode="numeric"
                value={formatPhone(phoneNumber)}
                onChange={(e) => setValue("phoneNumber", e.target.value, { shouldValidate: true })}
                onBlur={() => setValue("phoneNumber", (phoneNumber || "").replace(/\D/g, ""), { shouldValidate: true })}
              />
              <input type="hidden" {...register("phoneNumber")} />
              {errors.phoneNumber?.message && (
                <div className="text-sm text-rose-700">{errors.phoneNumber.message}</div>
              )}
            </div>
          </div>

          <div className="grid gap-3">
            <label className="text-xl font-semibold text-slate-950">Profile Picture (optional)</label>
            <input type="file" accept="image/jpeg,image/png" {...register("avatarFile")} />
            {avatarPreview && (
              <div className="relative h-32 w-32 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
                <Image src={avatarPreview} alt="Profile preview" fill className="object-cover" />
              </div>
            )}
          </div>

          <div className="grid gap-2">
            <label className="text-xl font-semibold text-slate-950">Bio (optional)</label>
            <textarea
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary min-h-24"
              placeholder="Tell us about yourself..."
              value={bio}
              maxLength={100}
              onChange={(e) => setValue("bio", e.target.value.slice(0, 100), { shouldValidate: true })}
            />
            <div className="text-xs text-slate-500">{(bio ?? "").length}/100</div>
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
              {["Cricket", "Basketball", "Soccer", "Tennis", "Volleyball", "Running", "Swimming", "Other"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
            {errors.sportInterest?.message && (
              <div className="text-sm text-rose-700">{errors.sportInterest.message}</div>
            )}
          </div>

          <div className="grid gap-3">
            <label className="text-xl font-semibold text-slate-950">Role</label>
            <Select
              className="bg-slate-100 border-slate-100 focus:border-brand-primary"
              {...register("role", { required: "Select a role" })}
            >
              <option value="" disabled>
                Select your role
              </option>
              <option value="Athlete">Athlete</option>
              <option value="Coach">Coach</option>
              <option value="Volunteer">Volunteer</option>
              <option value="Supporter">Supporter</option>
            </Select>
            {errors.role?.message && <div className="text-sm text-rose-700">{errors.role.message}</div>}
          </div>

          <div className="grid gap-3 pt-2">
            <label className="flex items-center gap-3 text-xl text-slate-700 select-none">
              <input
                type="checkbox"
                {...register("agreedToTerms", {
                  required: "You must agree to the terms",
                })}
                className="h-5 w-5 rounded border-slate-300"
              />
              <span>
                I agree to the{" "}
                <Link className="font-extrabold text-blue-600 hover:underline" href="/terms">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link className="font-extrabold text-blue-600 hover:underline" href="/privacy">
                  Privacy Policy
                </Link>
              </span>
            </label>
            {errors.agreedToTerms?.message && <div className="text-sm text-rose-700">{errors.agreedToTerms.message}</div>}
          </div>

          <Button type="submit" variant="dark" disabled={!canSubmit} className="w-full py-4 rounded-2xl text-xl">
            {submitting ? "Creating..." : "Create Account"}
          </Button>

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

