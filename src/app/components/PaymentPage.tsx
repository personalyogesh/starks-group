"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import Button from "@/components/ui/Button";
import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { Separator } from "@/app/components/ui/separator";
import { Badge } from "@/app/components/ui/badge";

import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Copy,
  CreditCard,
  DollarSign,
  ExternalLink,
  Heart,
  Shield,
  Users,
} from "lucide-react";

import logo from "@/assets/starks-logo.jpg";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/ToastProvider";
import { createDonation, createMemberIncomeTransaction, createMembershipPayment } from "@/lib/firebase/paymentService";
import { reportIssue } from "@/lib/reportIssue";
import {
  canViewPaymentInfo,
  DEFAULT_PAYMENT_CONFIG,
  fetchPaymentConfig,
  getAvailablePaymentMethods,
  PAYMENT_CONFIG,
  PaymentConfig,
} from "@/lib/config/paymentConfig";

type TabId = "membership" | "donation" | "event";
type MethodId = "zelle" | "paypal" | "venmo";

export default function PaymentPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser } = useAuth();

  const authUser = currentUser?.authUser ?? null;
  const userDoc = currentUser?.userDoc ?? null;

  const [tab, setTab] = useState<TabId>("membership");
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "annual" | "lifetime">("annual");
  const [paymentMethod, setPaymentMethod] = useState<MethodId>("zelle");

  const [customAmount, setCustomAmount] = useState("");
  const [donationPurpose, setDonationPurpose] = useState("general");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [membershipSubmissionDone, setMembershipSubmissionDone] = useState(false);
  const [donationSubmissionDone, setDonationSubmissionDone] = useState(false);

  const [cfg, setCfg] = useState<PaymentConfig>(DEFAULT_PAYMENT_CONFIG);
  const [cfgLoading, setCfgLoading] = useState(false);
  const [cfgError, setCfgError] = useState<string | null>(null);

  const displayName = useMemo(() => {
    return userDoc?.name || userDoc?.firstName || authUser?.displayName || authUser?.email || "Member";
  }, [userDoc, authUser]);

  const canSeePaymentInfo = useMemo(() => canViewPaymentInfo(authUser, cfg), [authUser, cfg]);

  useEffect(() => {
    let cancelled = false;
    if (!authUser) {
      // Do not fetch payment details for guests.
      setCfg(PAYMENT_CONFIG);
      setCfgLoading(false);
      setCfgError(null);
      return;
    }
    setCfgLoading(true);
    setCfgError(null);
    fetchPaymentConfig()
      .then((c) => {
        if (cancelled) return;
        setCfg(c);
      })
      .catch((err: any) => {
        if (cancelled) return;
        setCfg(PAYMENT_CONFIG);
        setCfgError(String(err?.message ?? "Failed to load payment configuration."));
      })
      .finally(() => {
        if (cancelled) return;
        setCfgLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authUser]);

  const plan = useMemo(() => {
    const p = cfg.membershipPlans[selectedPlan];
    return { id: selectedPlan, ...p };
  }, [cfg, selectedPlan]);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ kind: "success", title: "Copied", description: `${label} copied to clipboard.` });
    } catch (err: any) {
      toast({ kind: "error", title: "Copy failed", description: err?.message ?? "Could not copy." });
    }
  };

  const handleMembershipPayment = async () => {
    if (!authUser) {
      toast({ kind: "error", title: "Login required", description: "Please log in to purchase membership." });
      router.push("/login");
      return;
    }

    if (!canSeePaymentInfo) {
      toast({ kind: "error", title: "Not available", description: "Please log in again to view payment instructions." });
      return;
    }

    setProcessing(true);
    try {
      let transactionId: string | null = null;
      try {
        transactionId = await createMemberIncomeTransaction({
          amount: Number(plan.price),
          method: paymentMethod,
          purpose: "membership",
          category: "Membership Dues",
          description: `${selectedPlan} membership payment`,
          payerName: displayName,
          metadata: { plan: selectedPlan },
        });
      } catch (err: any) {
        // If Cloud Functions isn't deployed/misconfigured, Firebase can throw `internal` / `not-found`.
        // Don't block the user from recording their intent—continue without a transactionId.
        console.warn("[PaymentPage] createMemberIncomeTransaction failed; continuing without transactionId", err);
        toast({
          kind: "info",
          title: "Payment recorded (manual verification)",
          description:
            "We couldn’t attach an automatic transaction ID. Please complete payment using the instructions; admin will verify within 24 hours.",
        });
        reportIssue({
          message: err?.message ?? "createMemberIncomeTransaction failed",
          code: err?.code,
          stack: err?.stack,
          context: { source: "PaymentPage", action: "createMemberIncomeTransaction", method: paymentMethod, purpose: "membership" },
        });
      }

      // IMPORTANT: We are NOT charging inside the app yet (PayPal flow is scaffolded; Zelle/Venmo are manual).
      // We record intent + details for admin reconciliation.
      await createMembershipPayment(authUser.uid, displayName, {
        membershipType: selectedPlan,
        amount: Number(plan.price),
        method: paymentMethod,
        autoRenew: false,
        transactionId,
      });

      toast({
        kind: "success",
        title: "Membership recorded",
        description: "Now complete the payment using the instructions below. Admin will confirm within 24 hours.",
      });
      setMembershipSubmissionDone(true);
    } catch (error: any) {
      console.error("[PaymentPage] membership error", error);
      toast({ kind: "error", title: "Payment failed", description: error?.message ?? "Failed to record membership." });
      reportIssue({
        message: error?.message ?? "Failed to record membership.",
        code: error?.code,
        stack: error?.stack,
        context: { source: "PaymentPage", tab: "membership", method: paymentMethod, plan: selectedPlan },
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleDonation = async () => {
    const amount = Number(customAmount);
    if (!amount || amount <= 0) {
      toast({ kind: "error", title: "Invalid amount", description: "Please enter a valid donation amount." });
      return;
    }

    if (!canSeePaymentInfo) {
      toast({ kind: "error", title: "Login required", description: "Please log in to view payment instructions and donate." });
      router.push("/login");
      return;
    }

    setProcessing(true);
    try {
      let txId: string | null = null;
      try {
        txId = await createMemberIncomeTransaction({
          amount,
          method: paymentMethod,
          purpose: "donation",
          category: "Donations",
          subcategory: donationPurpose,
          description: `Donation: ${donationPurpose}`,
          payerName: isAnonymous ? "Anonymous" : displayName,
          metadata: { purpose: donationPurpose, anonymous: isAnonymous },
        });
      } catch (err: any) {
        console.warn("[PaymentPage] createMemberIncomeTransaction failed (donation); continuing", err);
        toast({
          kind: "info",
          title: "Donation recorded (manual verification)",
          description:
            "We couldn’t attach an automatic transaction ID. Please complete payment using the instructions; admin will verify within 24 hours.",
        });
        reportIssue({
          message: err?.message ?? "createMemberIncomeTransaction failed",
          code: err?.code,
          stack: err?.stack,
          context: { source: "PaymentPage", action: "createMemberIncomeTransaction", method: paymentMethod, purpose: "donation" },
        });
      }

      await createDonation({
        donorId: authUser?.uid,
        donorName: isAnonymous ? "Anonymous" : displayName,
        donorEmail: authUser?.email ?? "", // not stored (public-safe)
        amount,
        isAnonymous,
        taxDeductible: true,
        purpose: donationPurpose,
        method: paymentMethod,
        transactionId: txId,
      });

      toast({
        kind: "success",
        title: "Donation recorded",
        description: "Now complete the payment using the instructions below. Admin will confirm within 24 hours.",
      });
      setCustomAmount("");
      setDonationSubmissionDone(true);
    } catch (error: any) {
      console.error("[PaymentPage] donation error", error);
      toast({ kind: "error", title: "Donation failed", description: error?.message ?? "Failed to record donation." });
      reportIssue({
        message: error?.message ?? "Failed to record donation.",
        code: error?.code,
        stack: error?.stack,
        context: { source: "PaymentPage", tab: "donation", method: paymentMethod, purpose: donationPurpose },
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="size-4 mr-2" />
          Back
        </Button>
        <div className="flex items-center gap-3">
          <Image src={logo} alt="Starks Cricket" width={36} height={36} className="rounded-full ring-1 ring-slate-200" />
          <div className="leading-tight">
            <div className="text-xl font-extrabold tracking-tight text-slate-950 dark:text-slate-100">Payments</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Starks Group INC</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-3 gap-2">
        <TabButton active={tab === "membership"} onClick={() => setTab("membership")} icon={<Users className="size-4" />} label="Membership" />
        <TabButton active={tab === "donation"} onClick={() => setTab("donation")} icon={<Heart className="size-4" />} label="Donate" />
        <TabButton active={tab === "event"} onClick={() => setTab("event")} icon={<Calendar className="size-4" />} label="Event Fee" />
      </div>

      {tab === "membership" && (
        <div className="space-y-6">
          {cfgLoading && authUser && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200">
              Loading payment settings…
            </div>
          )}

          {cfgError && authUser && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">Couldn’t load payment settings.</div>
                  <div className="mt-1">{cfgError}</div>
                </div>
                <button
                  type="button"
                  className="underline font-semibold text-rose-900/80 whitespace-nowrap"
                  onClick={() =>
                    reportIssue({ message: cfgError, context: { source: "PaymentPage", feature: "paymentConfig" } })
                  }
                >
                  Report
                </button>
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-4 md:gap-6">
            {(["monthly", "annual", "lifetime"] as const).map((id) => {
              const p = cfg.membershipPlans[id];
              const selected = id === selectedPlan;
              return (
                <Card
                  key={id}
                  className={[
                    "relative cursor-pointer transition-all",
                    selected ? "ring-2 ring-blue-600 shadow-md" : "hover:shadow-sm",
                  ].join(" ")}
                  onClick={() => setSelectedPlan(id)}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-lg font-extrabold text-slate-950 dark:text-slate-100">
                          {id === "monthly" ? "Monthly" : id === "annual" ? "Annual" : "Lifetime"}
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">{p.description ?? ""}</div>
                      </div>
                      {p.badge && (
                        <Badge className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0">
                          {p.badge}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-4">
                      <div className="text-4xl font-extrabold text-slate-950 dark:text-slate-100">${p.price}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                        {p.billingCycle === "month" ? "/month" : p.billingCycle === "year" ? "/year" : "one-time"}
                      </div>
                    </div>
                  </CardHeader>
                  <CardBody>
                    <ul className="space-y-2">
                      {p.benefits.map((f, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
                          <CheckCircle className="size-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                    {selected && (
                      <div className="mt-4">
                        <Button className="w-full" variant="outline">
                          Selected
                        </Button>
                      </div>
                    )}
                  </CardBody>
                </Card>
              );
            })}
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 font-extrabold text-slate-950 dark:text-slate-100">
                <CreditCard className="size-5" />
                Payment Method
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Choose how you’d like to pay for your membership</div>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-200">
                  <b>Step 1:</b> Click <b>Submit for verification</b> to record your membership payment request.
                  <br />
                  <b>Step 2:</b> After submission, payment instructions will appear (Zelle/PayPal/Venmo).
                </div>
                <PaymentMethodSelector selected={paymentMethod} onSelect={setPaymentMethod} />
                <Separator />
                <SecurityNoticeCard />
                {membershipSubmissionDone ? (
                  <PaymentInstructions
                    method={paymentMethod}
                    cfg={cfg}
                    canSeePaymentInfo={canSeePaymentInfo}
                    onLogin={() => router.push("/login")}
                    onCopy={copyToClipboard}
                  />
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200">
                    Submit first to reveal payment details.
                  </div>
                )}
                <Button className="w-full" variant="dark" onClick={handleMembershipPayment} disabled={processing || !authUser}>
                  {processing ? "Processing..." : `Submit $${plan.price} (${plan.id}) for verification`}
                </Button>
                {!authUser && (
                  <div className="text-sm text-center text-slate-600 dark:text-slate-400">
                    Please{" "}
                    <button type="button" onClick={() => router.push("/login")} className="text-blue-600 hover:underline font-semibold">
                      login
                    </button>{" "}
                    to purchase membership.
                  </div>
                )}
              </div>
            </CardBody>
          </Card>

          <Card className="border-blue-200 bg-blue-50 dark:bg-slate-900 dark:border-slate-700">
            <CardBody>
              <div className="p-4 flex items-start gap-3">
                <Shield className="size-5 text-blue-600 mt-0.5" />
                <div className="text-sm">
                  <div className="font-bold text-slate-900 dark:text-slate-100">Tax information</div>
                  <div className="mt-1 text-slate-700 dark:text-slate-300">
                    If Starks Group INC is a registered non-profit, your payment may be tax-deductible. Tax ID:{" "}
                    <b>{cfg.organization.taxId ?? "—"}</b>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {tab === "donation" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 font-extrabold text-slate-950 dark:text-slate-100">
                <Heart className="size-5 text-rose-600" />
                Make a Donation
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Support our community programs and charitable initiatives
              </div>
            </CardHeader>
            <CardBody>
              <div className="space-y-5">
                <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-200">
                  <b>Step 1:</b> Click <b>Submit donation for verification</b> to record your donation.
                  <br />
                  <b>Step 2:</b> After submission, payment instructions will appear (Zelle/PayPal/Venmo).
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">Quick amount</div>
                  <div className="grid grid-cols-4 gap-2">
                    {[25, 50, 100, 250].map((amt) => (
                      <Button
                        key={amt}
                        variant={customAmount === String(amt) ? "dark" : "outline"}
                        onClick={() => setCustomAmount(String(amt))}
                      >
                        ${amt}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="custom-amount" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Custom amount
                  </label>
                  <div className="relative mt-2">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
                    <Input
                      id="custom-amount"
                      type="number"
                      inputMode="decimal"
                      placeholder="Enter amount"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-900 dark:text-slate-100">Donation purpose</label>
                  <div className="mt-2">
                    <Select value={donationPurpose} onChange={(e) => setDonationPurpose(e.target.value)}>
                      {cfg.donationCategories.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    id="anonymous"
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <label htmlFor="anonymous" className="text-sm text-slate-700 dark:text-slate-200">
                    Make this donation anonymous
                  </label>
                </div>

                <Separator />

                <PaymentMethodSelector selected={paymentMethod} onSelect={setPaymentMethod} />
                <SecurityNoticeCard />
                {donationSubmissionDone ? (
                  <PaymentInstructions
                    method={paymentMethod}
                    cfg={cfg}
                    canSeePaymentInfo={canSeePaymentInfo}
                    onLogin={() => router.push("/login")}
                    onCopy={copyToClipboard}
                  />
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200">
                    Submit first to reveal payment details.
                  </div>
                )}

                <Button className="w-full" variant="dark" onClick={handleDonation} disabled={processing || !customAmount}>
                  {processing ? "Processing..." : `Submit donation $${customAmount || "0"} for verification`}
                </Button>

                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  <b>Important:</b> This submission records your donation for tracking. Then pay using the instructions shown above.
                </div>
              </div>
            </CardBody>
          </Card>

          <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50 dark:bg-slate-900 dark:border-slate-700">
            <CardBody>
              <div className="p-6">
                <div className="font-extrabold text-lg text-slate-950 dark:text-slate-100">Your impact</div>
                <div className="mt-4 grid md:grid-cols-3 gap-4">
                  <ImpactStat amount="$25" text="Provides equipment for one child" />
                  <ImpactStat amount="$100" text="Sponsors one community event" />
                  <ImpactStat amount="$250" text="Funds youth program for a month" />
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {tab === "event" && (
        <Card>
          <CardHeader>
            <div className="font-extrabold text-slate-950 dark:text-slate-100">Event registration payment</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Pay for event registration fees</div>
          </CardHeader>
          <CardBody>
            <div className="text-slate-700 dark:text-slate-200">
              Event payment flow is coming soon. For now, please register from the Events page and follow the payment instructions there.
            </div>
            <div className="mt-4">
              <Button variant="outline" onClick={() => router.push("/events")}>
                View Events
              </Button>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "h-11 rounded-2xl border text-sm font-semibold flex items-center justify-center gap-2 transition-colors",
        active
          ? "bg-slate-950 text-white border-slate-950 dark:bg-white dark:text-slate-950 dark:border-white"
          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 dark:bg-slate-950 dark:text-slate-200 dark:border-slate-800 dark:hover:bg-slate-900",
      ].join(" ")}
    >
      {icon}
      {label}
    </button>
  );
}

function PaymentMethodSelector({
  selected,
  onSelect,
}: {
  selected: MethodId;
  onSelect: (method: MethodId) => void;
}) {
  const methods: Array<{ id: MethodId; name: string; icon: string; description: string }> = [
    { id: "zelle", name: "Zelle", icon: "💸", description: "Free, instant transfer" },
    { id: "paypal", name: "PayPal", icon: "💳", description: "Secure online payment" },
    { id: "venmo", name: "Venmo", icon: "📱", description: "Easy mobile payment" },
  ];

  return (
    <div className="grid md:grid-cols-3 gap-3">
      {methods.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => onSelect(m.id)}
          className={[
            "p-4 rounded-2xl border-2 text-left transition-all",
            selected === m.id
              ? "border-blue-600 bg-blue-50 dark:bg-blue-950"
              : "border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700",
          ].join(" ")}
        >
          <div className="text-3xl mb-2">{m.icon}</div>
          <div className="font-extrabold text-slate-950 dark:text-slate-100">{m.name}</div>
          <div className="text-xs text-slate-600 dark:text-slate-400">{m.description}</div>
        </button>
      ))}
    </div>
  );
}

function PaymentInstructions({
  method,
  cfg,
  canSeePaymentInfo,
  onLogin,
  onCopy,
}: {
  method: MethodId;
  cfg: PaymentConfig;
  canSeePaymentInfo: boolean;
  onLogin: () => void;
  onCopy: (text: string, label: string) => void;
}) {
  if (!canSeePaymentInfo) {
    return (
      <Card className="border-yellow-200 bg-yellow-50 dark:bg-slate-900 dark:border-slate-700">
        <CardBody>
          <div className="p-6 text-center">
            <Shield className="size-12 mx-auto text-yellow-600 mb-3" />
            <div className="font-semibold text-lg mb-2 text-slate-900 dark:text-slate-100">Authentication Required</div>
            <div className="text-sm text-slate-700 dark:text-slate-300 mb-4">
              Payment details are only available to registered members for security purposes.
            </div>
            <Button variant="dark" onClick={onLogin}>
              Login to View Payment Details
            </Button>
          </div>
        </CardBody>
      </Card>
    );
  }

  const info = cfg.paymentMethods;
  return (
    <Card className="bg-slate-50 dark:bg-slate-950">
      <CardHeader>
        <div className="text-sm font-extrabold text-slate-950 dark:text-slate-100 flex items-center gap-2">
          <Shield className="size-4 text-emerald-600" />
          Secure payment instructions
        </div>
      </CardHeader>
      <CardBody>
        <div className="space-y-3">
        {method === "zelle" && (
          <>
            <InfoRow
              label="Email"
              value={info.zelle.email ?? ""}
              onCopy={() => onCopy(info.zelle.email ?? "", "Zelle email")}
            />
            <InfoRow
              label="Recipient"
              value={info.zelle.displayName ?? ""}
              onCopy={() => onCopy(info.zelle.displayName ?? "", "Recipient name")}
            />
            <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-900 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-200">
              ℹ️ {info.zelle.instructions}
              <div className="mt-2 flex gap-4 text-xs">
                <span>⚡ {info.zelle.processingTime ?? "—"}</span>
                <span>💰 {info.zelle.fees ?? "—"}</span>
              </div>
            </div>
          </>
        )}

        {method === "paypal" && (
          <>
            <InfoRow
              label="PayPal email"
              value={info.paypal.email ?? ""}
              onCopy={() => onCopy(info.paypal.email ?? "", "PayPal email")}
            />
            <a
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100 dark:hover:bg-slate-800"
              href={info.paypal.link ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="size-4" />
              Open PayPal
            </a>
            <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-900 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-200">
              ℹ️ {info.paypal.instructions}
              <div className="mt-2 flex gap-4 text-xs">
                <span>⚡ {info.paypal.processingTime ?? "—"}</span>
                <span>💰 {info.paypal.fees ?? "—"}</span>
              </div>
            </div>
          </>
        )}

        {method === "venmo" && (
          <>
            <InfoRow
              label="Venmo username"
              value={info.venmo.username ?? ""}
              onCopy={() => onCopy(info.venmo.username ?? "", "Venmo username")}
            />
            <a
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100 dark:hover:bg-slate-800"
              href={info.venmo.link ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="size-4" />
              Open Venmo
            </a>
            <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-900 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-200">
              ℹ️ {info.venmo.instructions}
              <div className="mt-2 flex gap-4 text-xs">
                <span>⚡ {info.venmo.processingTime ?? "—"}</span>
                <span>💰 {info.venmo.fees ?? "—"}</span>
              </div>
            </div>
          </>
        )}

        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          <b>Important:</b> After payment, screenshot your confirmation and it will be verified within 24 hours. You’ll receive an email confirmation.
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-900 flex items-start gap-2 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-200">
          <Shield className="size-4 text-emerald-600 mt-0.5 flex-shrink-0" />
          <div>Your payment information is secure. We never store your payment credentials.</div>
        </div>
        </div>
      </CardBody>
    </Card>
  );
}

function SecurityNoticeCard() {
  return (
    <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50 dark:bg-slate-900 dark:border-slate-700">
      <CardBody>
        <div className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="size-6 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-emerald-900 dark:text-emerald-200 mb-2">Secure Payments</div>
              <ul className="text-sm text-emerald-800 dark:text-emerald-200/90 space-y-1">
                <li>✓ Payment details only visible to registered members</li>
                <li>✓ All transactions are recorded and verified</li>
                <li>✓ Tax-deductible receipts provided by admins</li>
                <li>✓ Your information is never shared with third parties</li>
              </ul>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function InfoRow({ label, value, onCopy }: { label: string; value: string; onCopy: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:bg-slate-900 dark:border-slate-800">
      <div className="min-w-0">
        <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">{label}</div>
        <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">{value}</div>
      </div>
      <button
        type="button"
        onClick={onCopy}
        className="h-10 w-10 rounded-2xl border border-slate-200 hover:bg-slate-50 grid place-items-center dark:border-slate-800 dark:hover:bg-slate-800"
        aria-label={`Copy ${label}`}
      >
        <Copy className="size-4 text-slate-600 dark:text-slate-300" />
      </button>
    </div>
  );
}

function ImpactStat({ amount, text }: { amount: string; text: string }) {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-white px-4 py-3 dark:bg-slate-950 dark:border-slate-800">
      <div className="text-2xl font-extrabold text-emerald-700">{amount}</div>
      <div className="mt-1 text-sm text-slate-700 dark:text-slate-300">{text}</div>
    </div>
  );
}

