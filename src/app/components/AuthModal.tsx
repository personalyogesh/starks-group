"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bookmark,
  Heart,
  MessageCircle,
  Trophy,
  Users,
  X,
} from "lucide-react";

import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useAuth } from "@/lib/AuthContext";

export type AuthModalTrigger = "like" | "comment" | "post" | "event" | "general";

export function AuthModal({
  open,
  onOpenChange,
  trigger = "general",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: AuthModalTrigger;
}) {
  const router = useRouter();
  const { login, loginWithGoogle, loading } = useAuth();

  const [tab, setTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const triggerMeta = useMemo(() => {
    switch (trigger) {
      case "like":
        return { Icon: Heart, title: "Like this post", subtitle: "Join Starks Cricket Club" };
      case "comment":
        return { Icon: MessageCircle, title: "Join the conversation", subtitle: "Join Starks Cricket Club" };
      case "post":
        return { Icon: Trophy, title: "Share your cricket journey", subtitle: "Join Starks Cricket Club" };
      case "event":
        return { Icon: Users, title: "Register for this event", subtitle: "Join Starks Cricket Club" };
      default:
        return { Icon: Users, title: "Connect with the community", subtitle: "Join Starks Cricket Club" };
    }
  }, [trigger]);

  async function handleLogin() {
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim().toLowerCase(), password);
      onOpenChange(false);
      setPassword("");
    } catch (e: any) {
      setError(e?.message || "Login failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setSubmitting(true);
    try {
      await loginWithGoogle();
      onOpenChange(false);
    } catch (e: any) {
      setError(e?.message || "Google sign-in failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      title="Join Starks Cricket"
      onClose={() => onOpenChange(false)}
      maxWidthClassName="max-w-lg"
      footer={
        <div className="text-center text-xs text-slate-500">
          By continuing, you agree to our{" "}
          <button
            type="button"
            className="text-brand-primary hover:underline"
            onClick={() => {
              onOpenChange(false);
              router.push("/terms");
            }}
          >
            Terms
          </button>{" "}
          and{" "}
          <button
            type="button"
            className="text-brand-primary hover:underline"
            onClick={() => {
              onOpenChange(false);
              router.push("/privacy");
            }}
          >
            Privacy Policy
          </button>
          .
        </div>
      }
    >
      {/* Header */}
      <div className="rounded-3xl overflow-hidden border border-slate-200">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
          <div className="flex items-start gap-4">
            <div className="size-12 bg-white/20 rounded-full flex items-center justify-center shrink-0">
              <triggerMeta.Icon className="size-6" />
            </div>
            <div className="min-w-0">
              <div className="text-2xl font-extrabold leading-tight">{triggerMeta.title}</div>
              <div className="text-blue-100 font-semibold">{triggerMeta.subtitle}</div>
            </div>
            <button
              type="button"
              className="ml-auto -mr-1 -mt-1 size-10 rounded-2xl hover:bg-white/10 grid place-items-center"
              aria-label="Close"
              onClick={() => onOpenChange(false)}
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="p-6">
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setTab("login")}
              className={[
                "rounded-xl px-3 py-2 text-sm font-bold transition",
                tab === "login" ? "bg-white shadow border border-slate-200" : "text-slate-600 hover:text-slate-900",
              ].join(" ")}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => setTab("register")}
              className={[
                "rounded-xl px-3 py-2 text-sm font-bold transition",
                tab === "register" ? "bg-white shadow border border-slate-200" : "text-slate-600 hover:text-slate-900",
              ].join(" ")}
            >
              Sign Up
            </button>
          </div>

          {tab === "login" ? (
            <div className="mt-5 space-y-4">
              <Button
                variant="outline"
                className="w-full flex items-center justify-center gap-3 bg-white"
                disabled={loading || submitting}
                onClick={handleGoogle}
                type="button"
              >
                <img src="/google.svg" alt="Google" className="h-5 w-5" />
                Continue with Google
              </Button>

              <div className="flex items-center gap-3">
                <div className="h-px bg-slate-200 flex-1" />
                <div className="text-xs font-semibold text-slate-500">or</div>
                <div className="h-px bg-slate-200 flex-1" />
              </div>

              <div>
                <div className="text-sm font-bold text-slate-800 mb-2">Email</div>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-800 mb-2">Password</div>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {error && <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-2xl p-3">{error}</div>}

              <Button
                variant="dark"
                className="w-full"
                disabled={loading || submitting || !email.trim() || !password}
                onClick={handleLogin}
              >
                {submitting ? "Logging in..." : "Login"}
              </Button>

              <div className="text-center text-sm text-slate-600">
                <button
                  type="button"
                  className="text-brand-primary font-bold hover:underline"
                  onClick={() => {
                    onOpenChange(false);
                    router.push("/login");
                  }}
                >
                  Forgot password?
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                Full signup includes phone, sport interest, and consent preferences.
              </div>
              <Button
                variant="dark"
                className="w-full"
                onClick={() => {
                  onOpenChange(false);
                  router.push("/register");
                }}
              >
                Continue to Sign Up
              </Button>
              <div className="text-center text-sm text-slate-600">
                Already have an account?{" "}
                <button type="button" className="text-brand-primary font-bold hover:underline" onClick={() => setTab("login")}>
                  Login
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Benefits */}
        <div className="bg-slate-50 p-6 border-t border-slate-200">
          <div className="font-extrabold mb-3 text-center">Join 2,500+ cricket enthusiasts</div>
          <div className="grid grid-cols-3 gap-3 text-center text-sm">
            <div>
              <div className="font-extrabold text-blue-700">Share</div>
              <div className="text-slate-600">Your Journey</div>
            </div>
            <div>
              <div className="font-extrabold text-blue-700">Connect</div>
              <div className="text-slate-600">With Players</div>
            </div>
            <div>
              <div className="font-extrabold text-blue-700">Join</div>
              <div className="text-slate-600">Events</div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

