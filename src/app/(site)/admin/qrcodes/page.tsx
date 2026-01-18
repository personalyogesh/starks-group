"use client";

import { RequireAdmin } from "@/components/RequireAdmin";
import { useEffect, useMemo, useState } from "react";
import { isFirebaseConfigured } from "@/lib/firebaseClient";
import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function AdminQRCodesPage() {
  const [mode, setMode] = useState<"preset" | "custom">("preset");
  const [preset, setPreset] = useState<"home" | "login" | "register">("home");
  const [customText, setCustomText] = useState("");
  const [origin, setOrigin] = useState<string>("");

  const text =
    mode === "custom"
      ? customText
      : preset === "home"
        ? `${origin}/?source=qr`
        : preset === "login"
          ? `${origin}/login?source=qr`
          : `${origin}/register?source=qr`;

  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [lastGeneratedAt, setLastGeneratedAt] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);

  const isValid = useMemo(() => {
    if (mode === "custom") return customText.trim().length > 0;
    // For presets, allow generating even if origin hasn't hydrated yet; we'll validate at click time.
    return true;
  }, [mode, customText, origin]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    setMsg(null);
    setDataUrl(null);
  }, [text, mode, preset, customText]);

  const memberOnlyHint = useMemo(() => {
    const t = text.trim();
    if (!t) return null;
    // Quick guard for common member-only routes; these will redirect unauthenticated/pending users.
    const lower = t.toLowerCase();
    if (lower.includes("/dashboard") || lower.includes("/create-post") || lower.includes("/profile")) {
      return "Heads up: this link looks like a member-only page. For public sharing, use Home/Login/Register.";
    }
    return null;
  }, [text]);

  function computeTarget() {
    const currentOrigin = origin || (typeof window !== "undefined" ? window.location.origin : "");
    const target =
      mode === "custom"
        ? customText.trim()
        : preset === "home"
          ? `${currentOrigin}/?source=qr`
          : preset === "login"
            ? `${currentOrigin}/login?source=qr`
            : `${currentOrigin}/register?source=qr`;
    return target || "";
  }

  async function generate() {
    setMsg(null);
    setGenerating(true);
    setLastGeneratedAt(Date.now());

    try {
      const target = computeTarget();
      if (!target.trim()) throw new Error("Missing QR target. Please try again.");

      const mod: any = await import("qrcode");
      const QRCode = mod?.default ?? mod;
      if (!QRCode?.toDataURL) throw new Error("QR library failed to load.");

      const url = await QRCode.toDataURL(target, {
        margin: 2,
        width: 512,
        color: { dark: "#0F4F6C", light: "#FFFFFF" },
      });
      setDataUrl(url);
    } catch (err: any) {
      console.warn("[AdminQRCodesPage] failed to generate QR", err);
      setMsg(err?.message ?? "Failed to generate QR code");
      setDataUrl(null);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <RequireAdmin>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">QR Codes</h1>
          <p className="text-slate-600 mt-1">
            Generate a QR code that sends people to the public Home page (where they can register or login), or paste any custom link/text.
          </p>
        </div>

        {!isFirebaseConfigured && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Firebase isn’t configured yet. (This page still works, but the rest of the admin tools need it.)
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <div className="font-bold">Create QR</div>
              <div className="text-sm text-slate-600 mt-1">Paste a link and generate.</div>
            </CardHeader>
            <CardBody>
              {msg && (
                <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                  {msg}
                </div>
              )}

              {memberOnlyHint && (
                <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  {memberOnlyHint}
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  generate();
                }}
                className="grid gap-4"
              >
                <div className="grid gap-2">
                  <label className="text-sm font-semibold">Destination</label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={[
                        "px-3 py-2 rounded-xl border text-sm font-semibold transition",
                        mode === "preset" ? "border-slate-900 text-slate-900 bg-white" : "border-slate-200 text-slate-700 hover:bg-slate-50",
                      ].join(" ")}
                      onClick={() => setMode("preset")}
                    >
                      Presets
                    </button>
                    <button
                      type="button"
                      className={[
                        "px-3 py-2 rounded-xl border text-sm font-semibold transition",
                        mode === "custom" ? "border-slate-900 text-slate-900 bg-white" : "border-slate-200 text-slate-700 hover:bg-slate-50",
                      ].join(" ")}
                      onClick={() => setMode("custom")}
                    >
                      Custom
                    </button>
                  </div>
                  {mode === "preset" ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={[
                          "px-3 py-2 rounded-xl border text-sm font-semibold transition",
                          preset === "home"
                            ? "border-blue-600 bg-blue-50 text-blue-800"
                            : "border-slate-200 text-slate-700 hover:bg-slate-50",
                        ].join(" ")}
                        onClick={() => setPreset("home")}
                      >
                        Home (recommended)
                      </button>
                      <button
                        type="button"
                        className={[
                          "px-3 py-2 rounded-xl border text-sm font-semibold transition",
                          preset === "register"
                            ? "border-blue-600 bg-blue-50 text-blue-800"
                            : "border-slate-200 text-slate-700 hover:bg-slate-50",
                        ].join(" ")}
                        onClick={() => setPreset("register")}
                      >
                        Register
                      </button>
                      <button
                        type="button"
                        className={[
                          "px-3 py-2 rounded-xl border text-sm font-semibold transition",
                          preset === "login"
                            ? "border-blue-600 bg-blue-50 text-blue-800"
                            : "border-slate-200 text-slate-700 hover:bg-slate-50",
                        ].join(" ")}
                        onClick={() => setPreset("login")}
                      >
                        Login
                      </button>
                    </div>
                  ) : (
                    <Input
                      placeholder="https://... (or any text)"
                      value={customText}
                      onChange={(e) => setCustomText(e.target.value)}
                      required
                    />
                  )}

                  <div className="pt-1">
                    <Button
                      type="button"
                      variant="dark"
                      disabled={!isValid || generating}
                      onClick={() => generate()}
                    >
                      {generating ? "Generating..." : "Generate QR"}
                    </Button>
                  </div>

                  <div className="text-xs text-slate-500">
                    QR target: <span className="font-mono break-all">{text || "—"}</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Debug: origin=<span className="font-mono">{origin || "(loading)"}</span> · computedTarget=
                    <span className="font-mono break-all"> {computeTarget() || "—"}</span>
                    {lastGeneratedAt ? (
                      <span className="ml-2">· last generated {new Date(lastGeneratedAt).toLocaleTimeString()}</span>
                    ) : null}
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="button" disabled={!isValid || generating} onClick={() => generate()}>
                    {generating ? "Generating..." : "Generate"}
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <div className="font-bold">Preview</div>
              <div className="text-sm text-slate-600 mt-1">Download and share.</div>
            </CardHeader>
            <CardBody>
              {!dataUrl ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-600">
                  Generate a QR code to preview it here.
                </div>
              ) : (
                <div className="grid gap-3">
                  <img
                    src={dataUrl}
                    alt="QR code preview"
                    className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-3"
                  />
                  <a href={dataUrl} download="starks-qr.png">
                    <Button variant="secondary">Download PNG</Button>
                  </a>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </RequireAdmin>
  );
}

