"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Clock,
  DollarSign,
  Download,
  Eye,
  FileText,
  Mail,
  RefreshCw,
  Send,
  Smartphone,
  Users,
} from "lucide-react";
import { addDoc, collection, getDocs, serverTimestamp } from "firebase/firestore";

import { useToast } from "@/components/ui/ToastProvider";
import { db, isFirebaseConfigured } from "@/lib/firebaseClient";
import { fetchPaymentConfig } from "@/lib/config/paymentConfig";

interface User {
  id: string;
  email: string;
  displayName: string;
  phoneNumber?: string;
  pushToken?: string;
  hasPaid2026: boolean;
  paymentDate?: string;
  notificationPreferences: {
    email: boolean;
    push: boolean;
  };
}

interface NotificationTemplate {
  id: string;
  type: "payment-request" | "payment-reminder" | "refund-info" | "refund-processed";
  subject: string;
  body: string;
  amount?: number;
  dueDate?: string;
}
type NotificationTemplateId = NotificationTemplate["type"];

interface NotificationCenterProps {
  navigateTo: (page: string) => void;
  currentUser: any;
}

export function NotificationCenter({ navigateTo, currentUser }: NotificationCenterProps) {
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();
  const defaultDueDate = `${currentYear}-03-31`;
  const DEFAULT_PAYPAL_LINK = "https://paypal.me/starksgroup";
  const DEFAULT_ZELLE_DETAILS = "starksgroup@starksgrp.org";

  const [users, setUsers] = useState<User[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<NotificationTemplateId>("payment-request");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const [formData, setFormData] = useState({
    subject: `${currentYear} Starks Cricket Registration Fee - Action Required`,
    amount: 0,
    dueDate: defaultDueDate,
    paypalLink: DEFAULT_PAYPAL_LINK,
    zelleDetails: DEFAULT_ZELLE_DETAILS,
    message: "",
    sendEmail: true,
    sendPush: false,
    sendToAll: true,
    selectedUserIds: [] as string[],
  });

  const [stats, setStats] = useState({
    totalUsers: 0,
    paidUsers: 0,
    pendingUsers: 0,
    emailOptIn: 0,
    pushOptIn: 0,
  });

  useEffect(() => {
    void loadUsers();
  }, []);

  useEffect(() => {
    void loadPaymentDefaults();
  }, []);

  const seasonYear = useMemo(() => {
    const parsed = new Date(formData.dueDate);
    return Number.isNaN(parsed.getTime()) ? currentYear : parsed.getFullYear();
  }, [formData.dueDate, currentYear]);

  const templates: Record<NotificationTemplateId, NotificationTemplate> = useMemo(
    () => ({
      "payment-request": {
        id: "payment-request",
        type: "payment-request",
        subject: `${seasonYear} Starks Cricket Registration Fee - Action Required`,
        body: `Dear {name},

We hope this message finds you well! As we prepare for an exciting ${seasonYear} season with Starks Cricket, we kindly request your registration fee payment.

💰 Registration Fee: ${formData.amount}
📅 Payment Due Date: {dueDate}
🔗 PayPal Link: {paypalLink}
🏦 Zelle Details: {zelleDetails}

IMPORTANT REFUND POLICY:
All registration fees will be held to cover operational expenses for the ${seasonYear} season. These include:
- Equipment and playing supplies
- Ground/venue bookings
- Tournament and umpiring assignment fees
- Miscellaneous operational expenses
- Ad hoc season expenses approved by admin

At year-end, once all expenses are settled, any remaining funds will be refunded proportionally to all paid members.
We will share a detailed expense breakdown report along with refund communication.

✅ Expected refund processing: December ${seasonYear}
✅ You'll receive email notification when refunds are processed
✅ Refund amount depends on total expenses vs. collected fees

Please complete your payment by {dueDate} to secure your spot for the ${seasonYear} season.

If you have any questions, please contact us at starksgroup@starksgrp.org

Stay connected:
🌐 Website: https://starksgrp.org
📸 Instagram: https://www.instagram.com/starkscricketclub
𝕏 X (Twitter): https://x.com/clubstarks
▶️ YouTube: https://youtube.com/@starkscricket

Thank you for your continued support!

Best regards,
Starks Group`,
        amount: formData.amount,
        dueDate: formData.dueDate,
      },
      "payment-reminder": {
        id: "payment-reminder",
        type: "payment-reminder",
        subject: `Reminder: ${seasonYear} Registration Fee Payment Pending`,
        body: `Dear {name},

This is a friendly reminder that your ${seasonYear} Starks Cricket registration fee payment is still pending.

💰 Amount Due: ${formData.amount}
📅 Due Date: {dueDate}
🔗 PayPal Link: {paypalLink}
🏦 Zelle Details: {zelleDetails}

Don't miss out on the ${seasonYear} season! Please complete your payment at your earliest convenience.

Remember: Refunds will be processed at year-end after all expenses are covered.
You will receive a detailed expense summary when refunds are processed.

Questions? Email us at starksgroup@starksgrp.org

Stay connected:
🌐 Website: https://starksgrp.org
📸 Instagram: https://www.instagram.com/starkscricketclub
𝕏 X (Twitter): https://x.com/clubstarks
▶️ YouTube: https://youtube.com/@starkscricket

Thank you!
Starks Group`,
        amount: formData.amount,
        dueDate: formData.dueDate,
      },
      "refund-info": {
        id: "refund-info",
        type: "refund-info",
        subject: `Starks Cricket ${seasonYear} - Refund Policy Information`,
        body: `Dear {name},

Thank you for your ${seasonYear} registration fee payment! This email confirms our refund policy for the season.

REFUND POLICY DETAILS:
• All registration fees are used to cover ${seasonYear} operational expenses
• Expenses include: equipment, venue rentals, tournament fees, insurance, etc.
• At year-end (December ${seasonYear}), we will calculate total expenses vs. collected fees
• If there are remaining funds, refunds will be processed proportionally
• You will receive email notification with refund details

TIMELINE:
✅ Now - Mid ${seasonYear}: Registration fees collected
✅ Throughout ${seasonYear}: Operational expenses paid
✅ December ${seasonYear}: Final expense calculation
✅ End of December ${seasonYear}: Refunds processed (if applicable)

We are committed to transparency and will share expense reports with all members.

Thank you for being part of Starks Cricket!

Stay connected:
🌐 Website: https://starksgrp.org
📸 Instagram: https://www.instagram.com/starkscricketclub
𝕏 X (Twitter): https://x.com/clubstarks
▶️ YouTube: https://youtube.com/@starkscricket

Best regards,
Starks Group`,
      },
      "refund-processed": {
        id: "refund-processed",
        type: "refund-processed",
        subject: `🎉 Starks Cricket ${seasonYear} - Refund Processed!`,
        body: `Dear {name},

Great news! We've completed our ${seasonYear} expense reconciliation and processed your refund.

REFUND DETAILS:
💰 Refund Amount: {refundAmount}
📅 Processed Date: {processedDate}
🏦 Payment Method: {paymentMethod}

EXPENSE SUMMARY:
• Total Registration Fees Collected: {totalCollected}
• Total Operational Expenses: {totalExpenses}
• Total Refunds Distributed: {totalRefunds}

Thank you for your patience and for being a valued member of Starks Cricket!

We look forward to seeing you in the 2027 season!

Stay connected:
🌐 Website: https://starksgrp.org
📸 Instagram: https://www.instagram.com/starkscricketclub
𝕏 X (Twitter): https://x.com/clubstarks
▶️ YouTube: https://youtube.com/@starkscricket

Best regards,
Starks Group`,
      },
    }),
    [formData.amount, formData.dueDate]
  );

  useEffect(() => {
    if (!formData.message.trim()) {
      const defaultTemplate = templates[selectedTemplate];
      if (defaultTemplate) {
        setFormData((prev) => ({
          ...prev,
          subject: defaultTemplate.subject,
          message: defaultTemplate.body,
        }));
      }
    }
  }, [selectedTemplate, templates, formData.message]);

  async function loadUsers() {
    setIsLoading(true);
    try {
      if (!isFirebaseConfigured) {
        setUsers([]);
        setStats({
          totalUsers: 0,
          paidUsers: 0,
          pendingUsers: 0,
          emailOptIn: 0,
          pushOptIn: 0,
        });
        toast({
          kind: "error",
          title: "Firebase not configured",
          description: "Set NEXT_PUBLIC_FIREBASE_* env vars to load real members.",
        });
        return;
      }

      const [usersSnap, membershipPaymentsSnap] = await Promise.all([
        getDocs(collection(db, "users")),
        getDocs(collection(db, "membershipPayments")),
      ]);

      const toDate = (value: any): Date | null => {
        try {
          if (value && typeof value.toDate === "function") return value.toDate();
          const d = new Date(value);
          return Number.isNaN(d.getTime()) ? null : d;
        } catch {
          return null;
        }
      };

      const paidUserMap = new Map<string, string>();
      membershipPaymentsSnap.docs.forEach((docSnap) => {
        const data = docSnap.data() as any;
        const userId = String(data?.userId ?? "");
        if (!userId) return;
        if (String(data?.status ?? "").toLowerCase() === "cancelled") return;

        const candidates = [toDate(data?.startDate), toDate(data?.createdAt), toDate(data?.endDate)].filter(
          Boolean
        ) as Date[];
        const relevantDate = candidates.find((d) => d.getFullYear() === seasonYear) ?? candidates[0];
        if (!relevantDate) return;
        if (!paidUserMap.has(userId)) {
          paidUserMap.set(userId, relevantDate.toISOString().split("T")[0]);
        }
      });

      const realUsers: User[] = usersSnap.docs
        .map((docSnap) => {
          const data = docSnap.data() as any;
          const email = String(data?.email ?? "").trim();
          if (!email) return null;

          const displayName =
            String(data?.name ?? "").trim() ||
            String(data?.firstName ?? "").trim() ||
            email;

          const emailPref = data?.preferences?.notifications?.email;
          const pushPref = data?.preferences?.notifications?.push;
          const pushToken = String(data?.fcmToken ?? data?.pushToken ?? "").trim();
          const hasPaid2026 = paidUserMap.has(docSnap.id);

          return {
            id: docSnap.id,
            email,
            displayName,
            phoneNumber: data?.fullPhoneNumber ?? data?.phoneNumber ?? data?.phone,
            pushToken: pushToken || undefined,
            hasPaid2026,
            paymentDate: hasPaid2026 ? paidUserMap.get(docSnap.id) : undefined,
            notificationPreferences: {
              email: typeof emailPref === "boolean" ? emailPref : true,
              push: typeof pushPref === "boolean" ? pushPref : Boolean(pushToken),
            },
          } satisfies User;
        })
        .filter(Boolean) as User[];

      setUsers(realUsers);
      setStats({
        totalUsers: realUsers.length,
        paidUsers: realUsers.filter((u) => u.hasPaid2026).length,
        pendingUsers: realUsers.filter((u) => !u.hasPaid2026).length,
        emailOptIn: realUsers.filter((u) => u.notificationPreferences.email).length,
        pushOptIn: realUsers.filter((u) => u.notificationPreferences.push).length,
      });

      if (realUsers.length === 0) {
        toast({
          kind: "info",
          title: "No members found",
          description: "No user records with email were found in Firestore.",
        });
      }
    } catch (error) {
      console.error("Failed to load users:", error);
      toast({
        kind: "error",
        title: "Failed to load users",
        description: "Please try refreshing the page.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function loadPaymentDefaults() {
    try {
      const cfg = await fetchPaymentConfig();
      const annualPrice = Number(cfg?.membershipPlans?.annual?.price ?? 0);
      const paypalLink =
        String(cfg?.paymentMethods?.paypal?.link ?? "").trim() ||
        String(cfg?.paymentMethods?.paypal?.email ?? "").trim() ||
        DEFAULT_PAYPAL_LINK;
      const zelleDetails =
        String(cfg?.paymentMethods?.zelle?.email ?? "").trim() || DEFAULT_ZELLE_DETAILS;

      setFormData((prev) => ({
        ...prev,
        amount: annualPrice > 0 ? annualPrice : prev.amount,
        paypalLink,
        zelleDetails,
      }));
    } catch {
      // Keep existing defaults if remote config is unavailable.
    }
  }

  function handleTemplateChange(templateId: NotificationTemplateId) {
    setSelectedTemplate(templateId);
    const template = templates[templateId];
    setFormData((prev) => ({
      ...prev,
      subject: template.subject,
      message: template.body,
    }));
  }

  function buildPersonalizedMessage(template: string, user: User) {
    const paypalLink = formData.paypalLink.trim() || DEFAULT_PAYPAL_LINK;
    const zelleDetails = formData.zelleDetails.trim() || DEFAULT_ZELLE_DETAILS;
    const paymentLink = paypalLink || "Contact admin for payment instructions.";
    return template
      .replaceAll("{name}", user.displayName)
      .replaceAll("{paymentLink}", paymentLink)
      .replaceAll("{paypalLink}", paypalLink || "Not provided")
      .replaceAll("{zelleDetails}", zelleDetails || "Not provided")
      .replaceAll("{dueDate}", formData.dueDate)
      .replaceAll("{amount}", String(formData.amount))
      .replaceAll("{refundAmount}", "TBD after year-end reconciliation")
      .replaceAll("{processedDate}", new Date().toISOString().split("T")[0])
      .replaceAll("{paymentMethod}", "Original payment method")
      .replaceAll("{totalCollected}", "TBD")
      .replaceAll("{totalExpenses}", "TBD")
      .replaceAll("{totalRefunds}", "TBD");
  }

  function openMailDraft(to: string, subject: string, body: string) {
    const href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = href;
  }

  function exportEmailDraftsCsv(
    rows: Array<{ email: string; subject: string; message: string }>
  ) {
    const escapeCsv = (value: string) => `"${value.replaceAll('"', '""').replaceAll("\n", "\\n")}"`;
    const csv = [
      "Email,Subject,Message",
      ...rows.map((r) => [escapeCsv(r.email), escapeCsv(r.subject), escapeCsv(r.message)].join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `email-drafts-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function toggleSelectedUser(userId: string, checked: boolean) {
    setFormData((prev) => ({
      ...prev,
      selectedUserIds: checked
        ? [...prev.selectedUserIds, userId]
        : prev.selectedUserIds.filter((id) => id !== userId),
    }));
  }

  async function logManualNotificationActivity(args: {
    mode: "draft-single" | "draft-csv";
    recipientCount: number;
    emailCount: number;
    pushCount: number;
    template: NotificationTemplateId;
    notes?: string;
  }) {
    if (!isFirebaseConfigured || !db) return;
    try {
      await addDoc(collection(db, "auditLogs"), {
        action: "notification_prepared",
        performedBy: currentUser?.uid ?? "unknown",
        targetId: null,
        changes: {
          mode: args.mode,
          template: args.template,
          recipientCount: args.recipientCount,
          emailCount: args.emailCount,
          pushCount: args.pushCount,
          notes: args.notes ?? "",
        },
        ipAddress: "N/A",
        timestamp: serverTimestamp(),
      });
    } catch (err) {
      console.warn("Failed to write audit log for notification activity", err);
    }
  }

  async function handleSendNotifications() {
    if (!formData.subject.trim()) {
      toast({ kind: "error", title: "Subject required", description: "Please enter a subject." });
      return;
    }

    if (!formData.message.trim()) {
      toast({ kind: "error", title: "Message required", description: "Please enter a message." });
      return;
    }

    if (!formData.sendEmail && !formData.sendPush) {
      toast({
        kind: "error",
        title: "No delivery method selected",
        description: "Select email, push, or both.",
      });
      return;
    }

    if (
      (selectedTemplate === "payment-request" || selectedTemplate === "payment-reminder") &&
      !formData.paypalLink.trim() &&
      !formData.zelleDetails.trim()
    ) {
      toast({
        kind: "error",
        title: "Payment instructions required",
        description: "Add PayPal link or Zelle details before sending payment notifications.",
      });
      return;
    }

    let recipients: User[] = [];
    if (formData.sendToAll) {
      if (selectedTemplate === "payment-request" || selectedTemplate === "payment-reminder") {
        const unpaid = users.filter((u) => !u.hasPaid2026);
        recipients = unpaid.length > 0 ? unpaid : users;
        if (unpaid.length === 0 && users.length > 0) {
          toast({
            kind: "info",
            title: "No pending users found",
            description: "Falling back to all registered users for this notification.",
          });
        }
      } else {
        recipients = users;
      }
    } else {
      recipients = users.filter((u) => formData.selectedUserIds.includes(u.id));
    }

    if (recipients.length === 0) {
      toast({
        kind: "error",
        title: "No recipients selected",
        description: "Choose at least one recipient.",
      });
      return;
    }

    const confirmMessage = `Preparing notification for ${recipients.length} user(s) via ${
      formData.sendEmail && formData.sendPush ? "Email & Push" : formData.sendEmail ? "Email" : "Push"
    }.`;
    toast({ kind: "info", title: "Preparing send", description: confirmMessage });

    setIsSending(true);
    const payload = recipients.map((recipient) => ({
      userId: recipient.id,
      email: recipient.email,
      name: recipient.displayName,
      pushToken: recipient.pushToken,
      subject: formData.subject,
      message: buildPersonalizedMessage(formData.message, recipient),
      template: selectedTemplate,
      amount: formData.amount,
      dueDate: formData.dueDate,
      sendEmail: formData.sendEmail && recipient.notificationPreferences.email,
      sendPush: formData.sendPush && recipient.notificationPreferences.push,
    }));

    const emailPayload = payload.filter((p) => p.sendEmail);
    const pushPayload = payload.filter((p) => p.sendPush);

    if (formData.sendEmail && emailPayload.length === 0) {
      toast({
        kind: "error",
        title: "No emailable recipients",
        description: "Selected users have email notifications disabled or missing emails.",
      });
      setIsSending(false);
      return;
    }

    try {
      if (emailPayload.length === 1) {
        openMailDraft(emailPayload[0].email, emailPayload[0].subject, emailPayload[0].message);
        await logManualNotificationActivity({
          mode: "draft-single",
          recipientCount: recipients.length,
          emailCount: emailPayload.length,
          pushCount: pushPayload.length,
          template: selectedTemplate,
          notes: "Opened single-recipient draft from notification center.",
        });
      } else if (emailPayload.length > 1) {
        exportEmailDraftsCsv(
          emailPayload.map((p) => ({
            email: p.email,
            subject: p.subject,
            message: p.message,
          }))
        );
        await logManualNotificationActivity({
          mode: "draft-csv",
          recipientCount: recipients.length,
          emailCount: emailPayload.length,
          pushCount: pushPayload.length,
          template: selectedTemplate,
          notes: "Exported multi-recipient email draft CSV from notification center.",
        });
      }

      toast({
        kind: "success",
        title: "Draft mode",
        description:
          emailPayload.length > 1
            ? `Exported ${emailPayload.length} email drafts CSV.`
            : emailPayload.length === 1
            ? `Opened draft for ${emailPayload[0].email}.`
            : "No email drafts generated.",
      });
    } finally {
      setIsSending(false);
    }
  }

  function handleSendTestToMe() {
    const adminEmail = String(currentUser?.email ?? "").trim();
    if (!adminEmail) {
      toast({
        kind: "error",
        title: "Admin email not found",
        description: "Please ensure your account has a valid email before sending a test.",
      });
      return;
    }

    if (!formData.subject.trim() || !formData.message.trim()) {
      toast({
        kind: "error",
        title: "Subject and message required",
        description: "Fill in subject/message before sending test email.",
      });
      return;
    }

    // Use a selected registered member (if any) so test drafts show realistic personalization.
    const selectedMember = users.find((u) => formData.selectedUserIds.includes(u.id));
    const testContextUser: User = selectedMember ?? {
      id: "admin-test",
      email: adminEmail,
      displayName: currentUser?.displayName || currentUser?.name || "Admin",
      hasPaid2026: false,
      notificationPreferences: { email: true, push: false },
    };
    const body = buildPersonalizedMessage(formData.message, testContextUser);
    openMailDraft(adminEmail, `[TEST] ${formData.subject}`, body);
    toast({
      kind: "success",
      title: "Test email draft opened",
      description: `Draft prepared for ${adminEmail} using ${testContextUser.displayName} as personalization context.`,
    });
  }

  function handleExportPendingUsers() {
    const pendingUsers = users.filter((u) => !u.hasPaid2026);
    const csv = [
      "Name,Email,Phone",
      ...pendingUsers.map((u) => `${u.displayName},${u.email},${u.phoneNumber || "N/A"}`),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pending-payments-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      kind: "success",
      title: "Export complete",
      description: `Exported ${pendingUsers.length} pending users.`,
    });
  }

  return (
    <div className="min-h-screen bg-neutral-50 pt-24 pb-16">
      <div className="container mx-auto px-6 max-w-7xl">
        <button
          onClick={() => navigateTo("admin-dashboard")}
          className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Dashboard
        </button>

        <div className="mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold text-neutral-900 mb-2">Notification Center</h1>
          <p className="text-lg text-neutral-600">Send payment requests and refund notifications to members</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-md border border-neutral-200">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-8 h-8 text-primary-600" />
              <span className="text-3xl font-bold text-neutral-900">{stats.totalUsers}</span>
            </div>
            <p className="text-sm text-neutral-600 font-medium">Total Users</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md border border-green-200">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <span className="text-3xl font-bold text-green-900">{stats.paidUsers}</span>
            </div>
            <p className="text-sm text-green-700 font-medium">Paid Users</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md border border-amber-200">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-8 h-8 text-amber-600" />
              <span className="text-3xl font-bold text-amber-900">{stats.pendingUsers}</span>
            </div>
            <p className="text-sm text-amber-700 font-medium">Pending Payment</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <Mail className="w-8 h-8 text-blue-600" />
              <span className="text-3xl font-bold text-blue-900">{stats.emailOptIn}</span>
            </div>
            <p className="text-sm text-blue-700 font-medium">Email Enabled</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md border border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <Smartphone className="w-8 h-8 text-purple-600" />
              <span className="text-3xl font-bold text-purple-900">{stats.pushOptIn}</span>
            </div>
            <p className="text-sm text-purple-700 font-medium">Push Enabled</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-md border border-neutral-200 p-6">
              <h2 className="text-2xl font-bold text-neutral-900 mb-6">Compose Notification</h2>

              <div className="mb-6">
                <label className="block text-sm font-medium text-neutral-700 mb-3">Select Template</label>
                <div className="grid sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => handleTemplateChange("payment-request")}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      selectedTemplate === "payment-request"
                        ? "border-primary-600 bg-primary-50"
                        : "border-neutral-200 hover:border-neutral-300"
                    }`}
                  >
                    <DollarSign
                      className={`w-6 h-6 mb-2 ${
                        selectedTemplate === "payment-request" ? "text-primary-600" : "text-neutral-600"
                      }`}
                    />
                    <h3 className="font-semibold text-neutral-900 mb-1">Payment Request</h3>
                    <p className="text-xs text-neutral-600">Initial payment request with refund policy</p>
                  </button>

                  <button
                    onClick={() => handleTemplateChange("payment-reminder")}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      selectedTemplate === "payment-reminder"
                        ? "border-primary-600 bg-primary-50"
                        : "border-neutral-200 hover:border-neutral-300"
                    }`}
                  >
                    <AlertCircle
                      className={`w-6 h-6 mb-2 ${
                        selectedTemplate === "payment-reminder" ? "text-primary-600" : "text-neutral-600"
                      }`}
                    />
                    <h3 className="font-semibold text-neutral-900 mb-1">Payment Reminder</h3>
                    <p className="text-xs text-neutral-600">Reminder for pending payments</p>
                  </button>

                  <button
                    onClick={() => handleTemplateChange("refund-info")}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      selectedTemplate === "refund-info"
                        ? "border-primary-600 bg-primary-50"
                        : "border-neutral-200 hover:border-neutral-300"
                    }`}
                  >
                    <FileText
                      className={`w-6 h-6 mb-2 ${
                        selectedTemplate === "refund-info" ? "text-primary-600" : "text-neutral-600"
                      }`}
                    />
                    <h3 className="font-semibold text-neutral-900 mb-1">Refund Policy Info</h3>
                    <p className="text-xs text-neutral-600">Explain refund policy to members</p>
                  </button>

                  <button
                    onClick={() => handleTemplateChange("refund-processed")}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      selectedTemplate === "refund-processed"
                        ? "border-primary-600 bg-primary-50"
                        : "border-neutral-200 hover:border-neutral-300"
                    }`}
                  >
                    <CheckCircle
                      className={`w-6 h-6 mb-2 ${
                        selectedTemplate === "refund-processed" ? "text-primary-600" : "text-neutral-600"
                      }`}
                    />
                    <h3 className="font-semibold text-neutral-900 mb-1">Refund Processed</h3>
                    <p className="text-xs text-neutral-600">Notify about completed refunds</p>
                  </button>
                </div>
              </div>

              {(selectedTemplate === "payment-request" || selectedTemplate === "payment-reminder") && (
                <div className="grid sm:grid-cols-2 gap-4 mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div>
                    <label className="block text-sm font-medium text-blue-900 mb-2">Registration Fee Amount ($)</label>
                    <input
                      type="number"
                      value={formData.amount}
                      onChange={(e) => setFormData((prev) => ({ ...prev, amount: Number(e.target.value) }))}
                      className="w-full px-4 py-2 rounded-lg border border-blue-300
                        focus:outline-none focus:ring-4 focus:ring-blue-500/30 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-blue-900 mb-2">Payment Due Date</label>
                    <input
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData((prev) => ({ ...prev, dueDate: e.target.value }))}
                      className="w-full px-4 py-2 rounded-lg border border-blue-300
                        focus:outline-none focus:ring-4 focus:ring-blue-500/30 focus:border-blue-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-blue-900 mb-2">
                      PayPal Payment Link (optional if using Zelle)
                    </label>
                    <input
                      type="url"
                      value={formData.paypalLink}
                      onChange={(e) => setFormData((prev) => ({ ...prev, paypalLink: e.target.value }))}
                      placeholder="https://paypal.me/your-link"
                      className="w-full px-4 py-2 rounded-lg border border-blue-300
                        focus:outline-none focus:ring-4 focus:ring-blue-500/30 focus:border-blue-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-blue-900 mb-2">
                      Zelle Details (optional if using PayPal)
                    </label>
                    <input
                      type="text"
                      value={formData.zelleDetails}
                      onChange={(e) => setFormData((prev) => ({ ...prev, zelleDetails: e.target.value }))}
                      placeholder="Zelle to: 123-456-7890 or email@domain.com"
                      className="w-full px-4 py-2 rounded-lg border border-blue-300
                        focus:outline-none focus:ring-4 focus:ring-blue-500/30 focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              <div className="mb-6">
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Email Subject <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData((prev) => ({ ...prev, subject: e.target.value }))}
                  className="w-full px-4 py-3 rounded-lg border border-neutral-300
                    focus:outline-none focus:ring-4 focus:ring-primary-500/30 focus:border-primary-500"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Message <span className="text-red-600">*</span>
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData((prev) => ({ ...prev, message: e.target.value }))}
                  rows={16}
                  className="w-full px-4 py-3 rounded-lg border border-neutral-300
                    focus:outline-none focus:ring-4 focus:ring-primary-500/30 focus:border-primary-500
                    resize-y font-mono text-sm"
                />
                <p className="text-xs text-neutral-500 mt-2">
                  Variables: {"{name}"}, {"{dueDate}"}, {"{amount}"}, {"{paypalLink}"}, {"{zelleDetails}"}
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-neutral-700 mb-3">Delivery Methods</label>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-3 px-4 py-3 rounded-lg border-2 border-neutral-200 hover:border-primary-300 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.sendEmail}
                      onChange={(e) => setFormData((prev) => ({ ...prev, sendEmail: e.target.checked }))}
                      className="w-5 h-5 rounded border-neutral-300 text-primary-600"
                    />
                    <Mail className="w-5 h-5 text-neutral-600" />
                    <span className="font-medium text-neutral-900">Email</span>
                  </label>

                  <label className="flex items-center gap-3 px-4 py-3 rounded-lg border-2 border-neutral-200 hover:border-primary-300 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.sendPush}
                      onChange={(e) => setFormData((prev) => ({ ...prev, sendPush: e.target.checked }))}
                      className="w-5 h-5 rounded border-neutral-300 text-primary-600"
                    />
                    <Smartphone className="w-5 h-5 text-neutral-600" />
                    <span className="font-medium text-neutral-900">Push Notification</span>
                  </label>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-neutral-700 mb-3">Recipients</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 px-4 py-3 rounded-lg border-2 border-neutral-200 hover:border-primary-300 cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name="recipient-scope"
                      checked={formData.sendToAll}
                      onChange={() => setFormData((prev) => ({ ...prev, sendToAll: true }))}
                      className="w-5 h-5 border-neutral-300 text-primary-600"
                    />
                    <span className="font-medium text-neutral-900">
                      {selectedTemplate === "payment-request" || selectedTemplate === "payment-reminder"
                        ? `All users with pending payment (${stats.pendingUsers})`
                        : `All registered users (${stats.totalUsers})`}
                    </span>
                  </label>

                  <label className="flex items-center gap-3 px-4 py-3 rounded-lg border-2 border-neutral-200 hover:border-primary-300 cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name="recipient-scope"
                      checked={!formData.sendToAll}
                      onChange={() => setFormData((prev) => ({ ...prev, sendToAll: false }))}
                      className="w-5 h-5 border-neutral-300 text-primary-600"
                    />
                    <span className="font-medium text-neutral-900">Select specific users</span>
                  </label>
                </div>
              </div>

              {!formData.sendToAll && (
                <div className="mb-6 rounded-lg border border-neutral-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-neutral-800">
                      Selected users: {formData.selectedUserIds.length}
                    </p>
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, selectedUserIds: [] }))}
                      className="text-xs text-neutral-600 hover:text-neutral-900"
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {users.map((user) => (
                      <label
                        key={user.id}
                        className="flex items-center justify-between gap-3 px-3 py-2 rounded-md border border-neutral-200 hover:border-primary-300 cursor-pointer"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-neutral-900 truncate">{user.displayName}</p>
                          <p className="text-xs text-neutral-600 truncate">{user.email}</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={formData.selectedUserIds.includes(user.id)}
                          onChange={(e) => toggleSelectedUser(user.id, e.target.checked)}
                          className="w-4 h-4 rounded border-neutral-300 text-primary-600"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={handleSendNotifications}
                disabled={isSending || isLoading}
                className="w-full py-4 rounded-lg font-semibold text-lg
                  bg-gradient-to-r from-primary-500 to-accent-500 text-white
                  hover:shadow-lg hover:scale-105 transition-all duration-300
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                  flex items-center justify-center gap-2"
              >
                {isSending ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    {selectedTemplate === "payment-request"
                      ? "Request Payment Now"
                      : selectedTemplate === "payment-reminder"
                      ? "Send Payment Reminder"
                      : "Send Notifications"}
                  </>
                )}
              </button>
              <p className="text-xs text-neutral-500 mt-2 text-center">
                Tip: set recipients above, then tap this button to open draft/export/send flow.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-md border border-neutral-200 p-6">
              <h3 className="font-bold text-neutral-900 mb-4">Quick Actions</h3>

              <div className="space-y-3">
                <button
                  onClick={() => handleTemplateChange("payment-request")}
                  className="w-full px-4 py-3 rounded-lg text-left font-medium
                    bg-primary-50 text-primary-700 hover:bg-primary-100
                    transition-colors flex items-center gap-2"
                >
                  <DollarSign className="w-5 h-5" />
                  Select Payment Request Template
                </button>

                <button
                  onClick={handleSendNotifications}
                  disabled={isSending || isLoading}
                  className="w-full px-4 py-3 rounded-lg text-left font-semibold
                    bg-blue-600 text-white hover:bg-blue-700 border border-blue-700
                    transition-colors flex items-center gap-2
                    disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                  {isSending ? "Sending..." : "Request Payment Now"}
                </button>

                <button
                  onClick={() => {
                    handleTemplateChange("payment-reminder");
                    setFormData((prev) => ({ ...prev, sendToAll: true }));
                  }}
                  className="w-full px-4 py-3 rounded-lg text-left font-medium
                    bg-amber-50 text-amber-700 hover:bg-amber-100
                    transition-colors flex items-center gap-2"
                >
                  <AlertCircle className="w-5 h-5" />
                  Send Reminders
                </button>

                <button
                  onClick={handleExportPendingUsers}
                  className="w-full px-4 py-3 rounded-lg text-left font-medium
                    bg-neutral-50 text-neutral-700 hover:bg-neutral-100
                    transition-colors flex items-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Export Pending Users
                </button>

                <button
                  onClick={handleSendTestToMe}
                  className="w-full px-4 py-3 rounded-lg text-left font-medium
                    bg-blue-50 text-blue-700 hover:bg-blue-100
                    transition-colors flex items-center gap-2"
                >
                  <Mail className="w-5 h-5" />
                  Send Test To Me
                </button>

                <button
                  onClick={() => navigateTo("payment-tracking")}
                  className="w-full px-4 py-3 rounded-lg text-left font-medium
                    bg-neutral-50 text-neutral-700 hover:bg-neutral-100
                    transition-colors flex items-center gap-2"
                >
                  <Eye className="w-5 h-5" />
                  View Payment Status
                </button>
              </div>
            </div>

            <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
              <h3 className="font-bold text-blue-900 mb-3">📌 Important Notes</h3>
              <ul className="space-y-2 text-sm text-blue-800">
                <li>• Emails sent only to users with email opt-in enabled</li>
                <li>• Push notifications require app installation and token setup</li>
                <li>• Payment links are secure and should expire after 30 days</li>
                <li>• Refund policy is included in payment communications</li>
                <li>• All notifications should be logged for audit tracking</li>
              </ul>
            </div>

            <div className="bg-green-50 rounded-xl border border-green-200 p-6">
              <h3 className="font-bold text-green-900 mb-3">💰 Refund Policy</h3>
              <div className="space-y-2 text-sm text-green-800">
                <p className="font-medium">{seasonYear} Season:</p>
                <ul className="space-y-1 ml-4">
                  <li>• Fees collected for operational expenses</li>
                  <li>• Refunds processed at year-end</li>
                  <li>• Based on remaining funds after expenses</li>
                  <li>• Expected: December {seasonYear}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
