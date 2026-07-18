"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Copy, ExternalLink, Printer, Ticket } from "lucide-react";

import { RequireAdmin } from "@/components/RequireAdmin";
import { Breadcrumbs } from "@/app/components/Breadcrumbs";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/ToastProvider";
import Button from "@/components/ui/Button";
import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import {
  createMvpGiftCardsBatch,
  subscribeMvpGiftCards,
  type MvpGiftCardDoc,
} from "@/lib/firebase/mvpGiftCardsService";

function toDateInputValue(date: Date) {
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10);
}

export default function AdminMvpGiftCardsPage() {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const [cards, setCards] = useState<Array<{ id: string; data: MvpGiftCardDoc }>>([]);
  const [playerNamesText, setPlayerNamesText] = useState("");
  const [amount, setAmount] = useState(25);
  const [seasonYear, setSeasonYear] = useState(2026);
  const [hasExpiry, setHasExpiry] = useState(false);
  const [expiryDate, setExpiryDate] = useState(toDateInputValue(new Date(Date.now() + 120 * 24 * 60 * 60 * 1000)));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeMvpGiftCards(setCards, {
      onError: () => {
        toast({
          kind: "error",
          title: "Gift card access failed",
          description: "Check Firestore rules for mvpGiftCards collection.",
        });
      },
    });
    return unsubscribe;
  }, [toast]);

  const seasonCards = useMemo(
    () => cards.filter((card) => card.data.seasonYear === seasonYear).sort((a, b) => a.data.code.localeCompare(b.data.code)),
    [cards, seasonYear],
  );
  const redeemedCount = seasonCards.filter((card) => card.data.redeemed).length;

  async function handleGenerate() {
    const playerNames = playerNamesText
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
    if (!playerNames.length) {
      toast({ kind: "error", title: "Add player names", description: "Use one player name per line." });
      return;
    }
    if (!currentUser?.authUser.uid) {
      toast({ kind: "error", title: "Login required", description: "Please sign in as admin." });
      return;
    }

    setSaving(true);
    try {
      const expiresAt = hasExpiry && expiryDate ? new Date(`${expiryDate}T23:59:59`) : null;
      const result = await createMvpGiftCardsBatch({
        playerNames,
        amount,
        seasonYear,
        issuedByUid: currentUser.authUser.uid,
        issuedByName: currentUser.userDoc?.name || currentUser.authUser.email || "Starks Admin",
        expiresAt,
      });
      setPlayerNamesText("");
      toast({
        kind: "success",
        title: "MVP gift cards generated",
        description: `Created ${result.created} cards for season ${seasonYear}.`,
      });
    } catch (error) {
      toast({
        kind: "error",
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      toast({ kind: "success", title: "Code copied", description: code });
    } catch {
      toast({ kind: "error", title: "Copy failed", description: "Copy manually from the table." });
    }
  }

  return (
    <RequireAdmin>
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <Breadcrumbs items={[{ label: "Admin", href: "/admin" }, { label: "MVP Gift Cards" }]} />

        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">MVP Gift Cards</h1>
            <p className="mt-1 text-slate-600">
              Generate $25 MVP cards with player names and redeem them one-time at Hashtag India Cary.
            </p>
          </div>
          <Link href="/redeem">
            <Button variant="outline">
              <ExternalLink className="size-4" />
              Open Redeem Portal
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <div className="font-bold text-lg">Generate Digital Cards</div>
            <div className="text-sm text-slate-600 mt-1">Paste one player per line. Each player gets a unique code.</div>
          </CardHeader>
          <CardBody>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-semibold text-slate-700">MVP player names (one per line)</label>
                <textarea
                  rows={6}
                  value={playerNamesText}
                  onChange={(event) => setPlayerNamesText(event.target.value)}
                  placeholder={"Rahul Iyer\nAnish Patel\nSai Kumar"}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/30"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Gift value ($)</label>
                <Input type="number" min={1} value={amount} onChange={(event) => setAmount(Number(event.target.value || 25))} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Season year</label>
                <Input type="number" min={2020} max={2100} value={seasonYear} onChange={(event) => setSeasonYear(Number(event.target.value || 2026))} />
              </div>

              <div className="flex items-center gap-3 pt-7">
                <input
                  id="gift-card-expiry"
                  type="checkbox"
                  checked={hasExpiry}
                  onChange={(event) => setHasExpiry(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-brand-primary focus:ring-brand-primary/30"
                />
                <label htmlFor="gift-card-expiry" className="text-sm font-semibold text-slate-700">
                  Add expiry date
                </label>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Expiry date</label>
                <Input type="date" value={expiryDate} onChange={(event) => setExpiryDate(event.target.value)} disabled={!hasExpiry} />
              </div>

              <div className="md:col-span-2">
                <Button onClick={() => void handleGenerate()} disabled={saving}>
                  <Ticket className="size-4" />
                  {saving ? "Generating..." : "Generate MVP Gift Cards"}
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div className="font-bold text-lg">Season {seasonYear} Cards</div>
            <div className="text-sm text-slate-600 mt-1">
              {seasonCards.length} issued · {redeemedCount} redeemed · {seasonCards.length - redeemedCount} valid
            </div>
          </CardHeader>
          <CardBody>
            {seasonCards.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
                No gift cards for {seasonYear} yet.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="min-w-[900px] w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="text-left font-semibold px-4 py-3">Code</th>
                      <th className="text-left font-semibold px-4 py-3">Player</th>
                      <th className="text-left font-semibold px-4 py-3">Amount</th>
                      <th className="text-left font-semibold px-4 py-3">Status</th>
                      <th className="text-left font-semibold px-4 py-3">Redeemed At</th>
                      <th className="text-right font-semibold px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {seasonCards.map((card) => (
                      <tr key={card.id}>
                        <td className="px-4 py-3 font-semibold text-slate-900">{card.data.code}</td>
                        <td className="px-4 py-3">{card.data.playerName}</td>
                        <td className="px-4 py-3">${card.data.amount.toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${
                              card.data.redeemed
                                ? "border-rose-200 bg-rose-50 text-rose-700"
                                : "border-emerald-200 bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {card.data.redeemed ? "Redeemed" : "Valid"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {card.data.redeemedAt ? card.data.redeemedAt.toDate().toLocaleString() : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => void copyCode(card.data.code)}>
                              <Copy className="size-4" />
                              Copy
                            </Button>
                            <Link href={`/redeem/${encodeURIComponent(card.data.code)}`}>
                              <Button size="sm" variant="outline">
                                <ExternalLink className="size-4" />
                                Open
                              </Button>
                            </Link>
                            <a href={`/redeem/${encodeURIComponent(card.data.code)}?print=1`} target="_blank" rel="noreferrer">
                              <Button size="sm" variant="outline">
                                <Printer className="size-4" />
                                Print
                              </Button>
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </RequireAdmin>
  );
}
