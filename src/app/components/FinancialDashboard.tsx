"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { RequireAdmin } from "@/components/RequireAdmin";
import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import Input from "@/components/ui/Input";
import { useToast } from "@/components/ui/ToastProvider";
import { reportIssue } from "@/lib/reportIssue";

import {
  approveTransaction,
  exportTransactionsToCSV,
  getCurrentFiscalYear,
  getDonationsAdmin,
  getFinancialSummary,
  getMembershipPaymentsAdmin,
  getTransactions,
  type Donation,
  type MembershipPayment,
  type Transaction,
} from "@/lib/firebase/paymentService";
import { useAuth } from "@/lib/AuthContext";
import {
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle,
  Clock,
  Download,
  FileText,
  PieChart,
  Receipt,
  TrendingDown,
  TrendingUp,
  XCircle,
} from "lucide-react";

type FilterType = "all" | "income" | "expense";
type FilterStatus = "all" | "pending" | "completed" | "cancelled" | "refunded";

function formatMoney(n: number) {
  try {
    return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  } catch {
    return String(n);
  }
}

function tsToDateString(v: any) {
  try {
    if (v && typeof v.toDate === "function") return v.toDate().toLocaleDateString();
  } catch {}
  return "—";
}

function tsToDate(v: any): Date | null {
  try {
    if (v && typeof v.toDate === "function") return v.toDate();
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

function dateInFiscalYear(d: Date | null, fy: number) {
  if (!d) return false;
  // Starks fiscal year = calendar year
  const start = new Date(fy, 0, 1); // Jan 1
  const end = new Date(fy + 1, 0, 1); // next Jan 1
  return d >= start && d < end;
}

export default function FinancialDashboard() {
  const { toast } = useToast();
  const { currentUser } = useAuth();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [membershipPayments, setMembershipPayments] = useState<MembershipPayment[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [summary, setSummary] = useState<null | {
    totalIncome: number;
    totalExpenses: number;
    netIncome: number;
    byCategory: Record<string, { income: number; expense: number }>;
  }>(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [selectedYear, setSelectedYear] = useState<number>(getCurrentFiscalYear());
  const [q, setQ] = useState("");
  const [approvingId, setApprovingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const filters: any = { fiscalYear: selectedYear };
        if (filterType !== "all") filters.type = filterType;
        if (filterStatus !== "all") filters.status = filterStatus;

        const [tx, s, mp, dn] = await Promise.all([
          getTransactions(filters),
          getFinancialSummary(selectedYear),
          getMembershipPaymentsAdmin({ max: 250 }),
          getDonationsAdmin({ max: 250 }),
        ]);
        if (cancelled) return;
        setTransactions(tx);
        setSummary(s);
        setMembershipPayments(mp);
        setDonations(dn);
      } catch (err: any) {
        console.error("[FinancialDashboard] load error", err);
        if (cancelled) return;
        setTransactions([]);
        setSummary(null);
        setMembershipPayments([]);
        setDonations([]);
        const code = String(err?.code ?? "");
        const msg =
          code === "permission-denied"
            ? "Missing or insufficient permissions. If you recently updated Firestore rules, deploy them with `firebase deploy --only firestore`."
            : String(err?.message ?? "Failed to load financial data.");
        setLoadError(msg);
        toast({ kind: "error", title: "Failed to load financial data", description: msg });
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [filterType, filterStatus, selectedYear, toast]);

  const filteredTx = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return transactions;
    return transactions.filter((x) => {
      return (
        String(x.category ?? "").toLowerCase().includes(t) ||
        String(x.description ?? "").toLowerCase().includes(t) ||
        String(x.payerName ?? "").toLowerCase().includes(t) ||
        String(x.payee ?? "").toLowerCase().includes(t) ||
        String(x.method ?? "").toLowerCase().includes(t) ||
        String(x.status ?? "").toLowerCase().includes(t)
      );
    });
  }, [transactions, q]);

  const pendingCount = useMemo(
    () => transactions.filter((t) => t.status === "pending").length,
    [transactions]
  );

  const membershipFy = useMemo(
    () => membershipPayments.filter((p) => dateInFiscalYear(tsToDate(p.createdAt), selectedYear)),
    [membershipPayments, selectedYear]
  );
  const donationsFy = useMemo(
    () => donations.filter((d) => dateInFiscalYear(tsToDate(d.createdAt), selectedYear)),
    [donations, selectedYear]
  );

  async function handleExportCSV() {
    try {
      const csv = await exportTransactionsToCSV(selectedYear);
      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `starks-cricket-transactions-${selectedYear}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast({ kind: "success", title: "Exported", description: "Transactions exported successfully." });
    } catch (err: any) {
      console.error("[FinancialDashboard] export error", err);
      toast({ kind: "error", title: "Export failed", description: err?.message ?? "Failed to export transactions." });
    }
  }

  async function handleApprove(id: string) {
    if (!currentUser?.authUser?.uid) return;
    setApprovingId(id);
    try {
      await approveTransaction(id, currentUser.authUser.uid);
      toast({ kind: "success", title: "Approved", description: "Transaction approved." });
      // Refresh quickly (simple and consistent)
      const [tx, s] = await Promise.all([
        getTransactions({ fiscalYear: selectedYear, ...(filterType !== "all" ? { type: filterType } : {}), ...(filterStatus !== "all" ? { status: filterStatus } : {}) }),
        getFinancialSummary(selectedYear),
      ]);
      setTransactions(tx);
      setSummary(s);
    } catch (err: any) {
      console.error("[FinancialDashboard] approve error", err);
      toast({ kind: "error", title: "Approve failed", description: err?.message ?? "Failed to approve transaction." });
    } finally {
      setApprovingId(null);
    }
  }

  return (
    <RequireAdmin>
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {loadError && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold">Financial data couldn’t load.</div>
                <div className="mt-1">{loadError}</div>
              </div>
              <button
                type="button"
                className="underline font-semibold text-rose-900/80 whitespace-nowrap"
                onClick={() => reportIssue({ message: loadError, context: { source: "FinancialDashboard" } })}
              >
                Report
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Financial Dashboard</h1>
            <p className="text-slate-600 mt-1">Track income, expenses, approvals, and exports for CPA.</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={String(selectedYear)} onChange={(e) => setSelectedYear(Number(e.target.value))}>
              <option value={getCurrentFiscalYear()}>FY {getCurrentFiscalYear()}</option>
              <option value={getCurrentFiscalYear() - 1}>FY {getCurrentFiscalYear() - 1}</option>
              <option value={getCurrentFiscalYear() - 2}>FY {getCurrentFiscalYear() - 2}</option>
            </Select>
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="size-4 mr-2" />
              Export CSV
            </Button>
            <Link href="/admin">
              <Button variant="outline">Back to Admin</Button>
            </Link>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard
              title="Total Income"
              value={`$${formatMoney(summary.totalIncome)}`}
              icon={<TrendingUp className="size-5 text-emerald-700" />}
              accent="emerald"
              sub={`Fiscal Year ${selectedYear}`}
              subIcon={<ArrowUpRight className="size-4" />}
            />
            <SummaryCard
              title="Total Expenses"
              value={`$${formatMoney(summary.totalExpenses)}`}
              icon={<TrendingDown className="size-5 text-rose-700" />}
              accent="rose"
              sub={`Fiscal Year ${selectedYear}`}
              subIcon={<ArrowDownRight className="size-4" />}
            />
            <SummaryCard
              title="Net Income"
              value={`$${formatMoney(summary.netIncome)}`}
              icon={<Receipt className="size-5 text-blue-700" />}
              accent={summary.netIncome >= 0 ? "blue" : "amber"}
              sub="Income − Expenses"
            />
            <SummaryCard
              title="Transactions"
              value={`${transactions.length}`}
              icon={<Receipt className="size-5 text-purple-700" />}
              accent="purple"
              sub={`${pendingCount} pending approval`}
            />
          </div>
        )}

        {/* Member-submitted payments (source of truth even if transactions ledger is empty) */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="font-bold text-lg">Member Payment Submissions</div>
                <div className="text-sm text-slate-600 mt-1">
                  Membership + donation records for FY {selectedYear}. If a row has no <b>transactionId</b>, the Cloud Function
                  transaction write likely failed (or wasn’t deployed), so it won’t appear in the Transactions ledger yet.
                </div>
              </div>
            </div>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-slate-200 overflow-x-auto">
                <div className="px-4 py-3 bg-slate-50 text-slate-700 font-semibold">Membership payments</div>
                <table className="min-w-[720px] w-full text-sm">
                  <thead className="text-slate-600">
                    <tr>
                      <th className="text-left font-semibold px-4 py-3">Date</th>
                      <th className="text-left font-semibold px-4 py-3">Member</th>
                      <th className="text-left font-semibold px-4 py-3">Type</th>
                      <th className="text-right font-semibold px-4 py-3">Amount</th>
                      <th className="text-left font-semibold px-4 py-3">Transaction</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-600">
                          Loading…
                        </td>
                      </tr>
                    ) : membershipFy.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-600">
                          No membership payments found.
                        </td>
                      </tr>
                    ) : (
                      membershipFy.slice(0, 50).map((p) => (
                        <tr key={p.id}>
                          <td className="px-4 py-3">{tsToDateString(p.createdAt)}</td>
                          <td className="px-4 py-3">{p.userName ?? p.userId}</td>
                          <td className="px-4 py-3 capitalize">{p.membershipType}</td>
                          <td className="px-4 py-3 text-right font-semibold">${Number(p.amount || 0).toFixed(2)}</td>
                          <td className="px-4 py-3">
                            {p.transactionId ? (
                              <span className="font-mono text-xs">{p.transactionId}</span>
                            ) : (
                              <span className="inline-flex rounded-full border px-3 py-1 font-semibold bg-amber-50 text-amber-800 border-amber-200">
                                Unlinked
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="rounded-2xl border border-slate-200 overflow-x-auto">
                <div className="px-4 py-3 bg-slate-50 text-slate-700 font-semibold">Donations</div>
                <table className="min-w-[720px] w-full text-sm">
                  <thead className="text-slate-600">
                    <tr>
                      <th className="text-left font-semibold px-4 py-3">Date</th>
                      <th className="text-left font-semibold px-4 py-3">Donor</th>
                      <th className="text-left font-semibold px-4 py-3">Purpose</th>
                      <th className="text-right font-semibold px-4 py-3">Amount</th>
                      <th className="text-left font-semibold px-4 py-3">Transaction</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-600">
                          Loading…
                        </td>
                      </tr>
                    ) : donationsFy.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-600">
                          No donations found.
                        </td>
                      </tr>
                    ) : (
                      donationsFy.slice(0, 50).map((d) => (
                        <tr key={d.id}>
                          <td className="px-4 py-3">{tsToDateString(d.createdAt)}</td>
                          <td className="px-4 py-3">{d.donorName ?? d.donorId ?? "—"}</td>
                          <td className="px-4 py-3">{d.purpose ?? "—"}</td>
                          <td className="px-4 py-3 text-right font-semibold">${Number(d.amount || 0).toFixed(2)}</td>
                          <td className="px-4 py-3">
                            {d.transactionId ? (
                              <span className="font-mono text-xs">{d.transactionId}</span>
                            ) : (
                              <span className="inline-flex rounded-full border px-3 py-1 font-semibold bg-amber-50 text-amber-800 border-amber-200">
                                Unlinked
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Category Breakdown */}
        {summary && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 font-bold text-lg">
                <PieChart className="size-5" />
                Category Breakdown
              </div>
              <div className="text-sm text-slate-600">Income and expenses by category</div>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                {Object.entries(summary.byCategory).length === 0 && (
                  <div className="text-sm text-slate-600">No category data yet.</div>
                )}
                {Object.entries(summary.byCategory).map(([category, data]) => {
                  const incomePct = summary.totalIncome > 0 ? (data.income / summary.totalIncome) * 100 : 0;
                  const expPct = summary.totalExpenses > 0 ? (data.expense / summary.totalExpenses) * 100 : 0;
                  return (
                    <div key={category} className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-semibold text-slate-900">{category}</div>
                        <div className="text-sm text-slate-600">
                          Net: <b>${formatMoney(data.income - data.expense)}</b>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 rounded-full bg-slate-200 overflow-hidden">
                            <div className="h-2 bg-emerald-600" style={{ width: `${incomePct}%` }} />
                          </div>
                          <div className="text-sm font-semibold text-emerald-700 w-28 text-right">+${formatMoney(data.income)}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 rounded-full bg-slate-200 overflow-hidden">
                            <div className="h-2 bg-rose-600" style={{ width: `${expPct}%` }} />
                          </div>
                          <div className="text-sm font-semibold text-rose-700 w-28 text-right">-${formatMoney(data.expense)}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardBody>
          </Card>
        )}

        {/* Transactions */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2 font-bold text-lg">
                  <FileText className="size-5" />
                  All Transactions
                </div>
                <div className="text-sm text-slate-600">Detailed transaction history and approval workflow</div>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <Input
                  placeholder="Search category, payer/payee, method..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="w-[260px]"
                />
                <Select value={filterType} onChange={(e) => setFilterType(e.target.value as any)}>
                  <option value="all">All Types</option>
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </Select>
                <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)}>
                  <option value="all">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="refunded">Refunded</option>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardBody>
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-[980px] w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="text-left font-semibold px-4 py-3">Date</th>
                    <th className="text-left font-semibold px-4 py-3">Type</th>
                    <th className="text-left font-semibold px-4 py-3">Category</th>
                    <th className="text-left font-semibold px-4 py-3">Description</th>
                    <th className="text-left font-semibold px-4 py-3">Payer/Payee</th>
                    <th className="text-left font-semibold px-4 py-3">Method</th>
                    <th className="text-right font-semibold px-4 py-3">Amount</th>
                    <th className="text-left font-semibold px-4 py-3">Status</th>
                    <th className="text-right font-semibold px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-10 text-center text-slate-600">
                        Loading transactions…
                      </td>
                    </tr>
                  ) : filteredTx.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-10 text-center text-slate-600">
                        No transactions found.
                      </td>
                    </tr>
                  ) : (
                    filteredTx.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-3">{tsToDateString(t.createdAt)}</td>
                        <td className="px-4 py-3">
                          <span
                            className={[
                              "inline-flex rounded-full border px-3 py-1 font-semibold capitalize",
                              t.type === "income"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-rose-50 text-rose-700 border-rose-200",
                            ].join(" ")}
                          >
                            {t.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900">{t.category}</td>
                        <td className="px-4 py-3 max-w-[340px] truncate text-slate-700">{t.description}</td>
                        <td className="px-4 py-3 text-slate-700">
                          {t.type === "income" ? (t.payerName ?? "—") : (t.payee ?? "—")}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex rounded-full border px-3 py-1 font-semibold bg-slate-50 text-slate-700 border-slate-200 capitalize">
                            {t.method}
                          </span>
                        </td>
                        <td
                          className={[
                            "px-4 py-3 text-right font-extrabold",
                            t.type === "income" ? "text-emerald-700" : "text-rose-700",
                          ].join(" ")}
                        >
                          {t.type === "income" ? "+" : "-"}${Number(t.amount || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          {t.status === "completed" ? (
                            <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 font-semibold bg-emerald-50 text-emerald-700 border-emerald-200">
                              <CheckCircle className="size-4" /> Completed
                            </span>
                          ) : t.status === "pending" ? (
                            <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 font-semibold bg-amber-50 text-amber-800 border-amber-200">
                              <Clock className="size-4" /> Pending
                            </span>
                          ) : t.status === "cancelled" ? (
                            <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 font-semibold bg-rose-50 text-rose-700 border-rose-200">
                              <XCircle className="size-4" /> Cancelled
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 font-semibold bg-slate-50 text-slate-700 border-slate-200">
                              {t.status}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {t.status === "pending" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={approvingId === t.id}
                              onClick={() => handleApprove(t.id)}
                            >
                              {approvingId === t.id ? "Approving…" : "Approve"}
                            </Button>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>

        {/* Quick Actions */}
        <Card className="border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardHeader>
            <div className="font-bold text-lg">Quick Actions</div>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Button variant="outline" className="justify-start" disabled title="Coming soon">
                <Receipt className="size-5 mr-3" />
                Record Expense (coming soon)
              </Button>
              <Button variant="outline" className="justify-start" disabled title="Coming soon">
                <FileText className="size-5 mr-3" />
                Generate Year-End Report (coming soon)
              </Button>
              <Button variant="outline" className="justify-start" onClick={handleExportCSV}>
                <Download className="size-5 mr-3" />
                Export for CPA (CSV)
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </RequireAdmin>
  );
}

function SummaryCard({
  title,
  value,
  icon,
  accent,
  sub,
  subIcon,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  accent: "emerald" | "rose" | "blue" | "amber" | "purple";
  sub: string;
  subIcon?: React.ReactNode;
}) {
  const accentBg =
    accent === "emerald"
      ? "bg-emerald-100"
      : accent === "rose"
      ? "bg-rose-100"
      : accent === "amber"
      ? "bg-amber-100"
      : accent === "purple"
      ? "bg-purple-100"
      : "bg-blue-100";

  const accentText =
    accent === "emerald"
      ? "text-emerald-700"
      : accent === "rose"
      ? "text-rose-700"
      : accent === "amber"
      ? "text-amber-800"
      : accent === "purple"
      ? "text-purple-700"
      : "text-blue-700";

  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-slate-600 font-semibold">{title}</span>
        <div className={["size-10 rounded-full flex items-center justify-center", accentBg].join(" ")}>{icon}</div>
      </div>
      <div className={["text-3xl font-extrabold tracking-tight", accentText].join(" ")}>{value}</div>
      <div className={["mt-2 text-sm font-semibold flex items-center gap-1", accentText].join(" ")}>
        {subIcon ?? null}
        <span>{sub}</span>
      </div>
    </div>
  );
}

