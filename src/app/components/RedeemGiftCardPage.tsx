"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Download, Gift, XCircle } from "lucide-react";

import { useAuth } from "@/lib/AuthContext";
import Button from "@/components/ui/Button";
import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import { useToast } from "@/components/ui/ToastProvider";
import { getMvpGiftCardByCode, redeemMvpGiftCard, type MvpGiftCardDoc } from "@/lib/firebase/mvpGiftCardsService";

type RedeemGiftCardPageProps = {
  initialCode?: string;
};

export default function RedeemGiftCardPage({ initialCode = "" }: RedeemGiftCardPageProps) {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [codeInput, setCodeInput] = useState(initialCode);
  const [loading, setLoading] = useState(Boolean(initialCode));
  const [redeeming, setRedeeming] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [card, setCard] = useState<{ id: string; data: MvpGiftCardDoc } | null>(null);
  const [lookupError, setLookupError] = useState("");
  const canRedeem = currentUser?.userDoc?.role === "admin";
  const printableCardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!initialCode) return;
    void lookupCode(initialCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode]);

  const isExpired = useMemo(() => {
    if (!card?.data.expiresAt) return false;
    return card.data.expiresAt.toMillis() < Date.now();
  }, [card]);

  async function lookupCode(rawCode: string) {
    const cleaned = rawCode.trim();
    if (!cleaned) {
      setLookupError("Enter a gift card code.");
      setCard(null);
      return;
    }
    setLoading(true);
    setLookupError("");
    try {
      const found = await getMvpGiftCardByCode(cleaned);
      if (!found) {
        setLookupError("Code not found.");
        setCard(null);
        return;
      }
      setCard(found);
    } catch {
      setLookupError("Unable to verify this code right now.");
      setCard(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleRedeemNow() {
    if (!card) return;
    if (!currentUser?.authUser.uid) return;
    setRedeeming(true);
    try {
      await redeemMvpGiftCard({
        code: card.data.code,
        byUid: currentUser.authUser.uid,
        byEmail: currentUser.authUser.email ?? "",
      });
      const fresh = await getMvpGiftCardByCode(card.data.code);
      setCard(fresh);
      toast({
        kind: "success",
        title: "Gift card redeemed",
        description: `${card.data.playerName} - $${card.data.amount.toFixed(2)} marked redeemed.`,
      });
    } catch (error) {
      toast({
        kind: "error",
        title: "Redeem failed",
        description: error instanceof Error ? error.message : "Try again.",
      });
    } finally {
      setRedeeming(false);
    }
  }

  async function handleDownloadPdf() {
    if (!card || !printableCardRef.current) return;
    setDownloading(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);

      const canvas = await html2canvas(printableCardRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const imageData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? "landscape" : "portrait",
        unit: "pt",
        format: [canvas.width, canvas.height],
      });
      pdf.addImage(imageData, "PNG", 0, 0, canvas.width, canvas.height);
      pdf.save(`${card.data.code}.pdf`);
      toast({ kind: "success", title: "PDF downloaded", description: `${card.data.code}.pdf` });
    } catch {
      toast({ kind: "error", title: "Download failed", description: "Please try again." });
    } finally {
      setDownloading(false);
    }
  }

  const statusLabel = card
    ? card.data.redeemed
      ? "Redeemed"
      : isExpired
        ? "Expired"
        : "Valid"
    : "Unknown";

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">MVP Gift Card Redemption</h1>
        <p className="text-slate-600">Enter a code to verify status and redeem one-time at Hashtag India Cary.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="font-bold text-lg">Check Gift Card Code</div>
        </CardHeader>
        <CardBody>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              value={codeInput}
              onChange={(event) => setCodeInput(event.target.value)}
              placeholder="HTI-STARKS-2026-001"
            />
            <Button onClick={() => void lookupCode(codeInput)} disabled={loading}>
              {loading ? "Checking..." : "Check Code"}
            </Button>
          </div>
          {lookupError ? <p className="mt-3 text-sm font-semibold text-rose-700">{lookupError}</p> : null}
        </CardBody>
      </Card>

      {card ? (
        <Card className="overflow-hidden rounded-[28px] border-indigo-200">
          <CardBody>
            <div ref={printableCardRef} className="rounded-[22px] border border-slate-200 bg-gradient-to-br from-white via-indigo-50 to-blue-50 p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-indigo-700">
                  <Gift className="size-4" />
                  Starks MVP Gift Card
                </div>
                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] ${
                    statusLabel === "Valid"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-rose-200 bg-rose-50 text-rose-700"
                  }`}
                >
                  {statusLabel}
                </span>
              </div>

              <div className="mt-6 space-y-2">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-600">Player Name</p>
                <p className="text-3xl font-black text-slate-950">{card.data.playerName}</p>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/80 bg-white/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">Gift Value</p>
                  <p className="mt-2 text-2xl font-black text-slate-950">${card.data.amount.toFixed(2)}</p>
                </div>
                <div className="rounded-2xl border border-white/80 bg-white/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">Code</p>
                  <p className="mt-2 text-lg font-black text-slate-950">{card.data.code}</p>
                </div>
              </div>

              <div className="mt-5 text-sm text-slate-600">
                <p>
                  <strong>Season:</strong> {card.data.seasonYear}
                </p>
                <p>
                  <strong>Issued:</strong> {card.data.issuedAt ? card.data.issuedAt.toDate().toLocaleString() : "—"}
                </p>
                <p>
                  <strong>Expires:</strong> {card.data.expiresAt ? card.data.expiresAt.toDate().toLocaleString() : "No expiry"}
                </p>
                <p>
                  <strong>Redeemed:</strong> {card.data.redeemedAt ? card.data.redeemedAt.toDate().toLocaleString() : "Not yet"}
                </p>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button variant="outline" onClick={() => void handleDownloadPdf()} disabled={downloading}>
                  <Download className="size-4" />
                  {downloading ? "Preparing PDF..." : "Download PDF"}
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      ) : null}

      {card && !card.data.redeemed && !isExpired ? (
        <Card>
          <CardHeader>
            <div className="font-bold text-lg">Restaurant Staff Action</div>
            <div className="text-sm text-slate-600 mt-1">Only admins can complete one-time redemption.</div>
          </CardHeader>
          <CardBody>
            {canRedeem ? (
              <Button onClick={() => void handleRedeemNow()} disabled={redeeming}>
                {redeeming ? "Redeeming..." : "Redeem Now"}
              </Button>
            ) : (
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-amber-700">
                <XCircle className="size-4" />
                Sign in as admin to redeem this card.
              </p>
            )}
          </CardBody>
        </Card>
      ) : null}

      {card && card.data.redeemed ? (
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700">
          <CheckCircle2 className="size-4" />
          This gift card has already been redeemed.
        </p>
      ) : null}

      <div className="text-sm text-slate-500">
        Need bulk generation?{" "}
        <Link className="font-semibold text-blue-700 hover:underline" href="/admin/mvp-gift-cards">
          Open Admin MVP Gift Cards
        </Link>
        .
      </div>
    </div>
  );
}
