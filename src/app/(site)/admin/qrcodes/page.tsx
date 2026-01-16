"use client";

import { RequireAdmin } from "@/components/RequireAdmin";
import { useEffect, useMemo, useState } from "react";
import { isFirebaseConfigured } from "@/lib/firebaseClient";
import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import QRCode from "qrcode";

export default function AdminQRCodesPage() {
  const [text, setText] = useState("");
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const isValid = useMemo(() => text.trim().length > 0, [text]);

  useEffect(() => {
    setMsg(null);
    setDataUrl(null);
  }, [text]);

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    try {
      const url = await QRCode.toDataURL(text.trim(), {
        margin: 2,
        width: 512,
        color: { dark: "#0F4F6C", light: "#FFFFFF" },
      });
      setDataUrl(url);
    } catch (err: any) {
      setMsg(err?.message ?? "Failed to generate QR code");
    }
  }

  return (
    <RequireAdmin>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">QR Codes</h1>
          <p className="text-slate-600 mt-1">
            Generate a QR code for event signup links, forms, or any URL/text.
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

              <form onSubmit={generate} className="grid gap-4">
                <div className="grid gap-2">
                  <label className="text-sm font-semibold">Link / Text</label>
                  <Input
                    placeholder="https://..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    required
                  />
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={!isValid}>
                    Generate
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

