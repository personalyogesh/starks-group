export type NotificationTemplateType =
  | "payment-request"
  | "payment-reminder"
  | "refund-info"
  | "refund-processed";

interface EmailParams {
  to: string;
  toName: string;
  subject: string;
  htmlContent: string;
  textContent: string;
}

export interface PaymentNotificationParams {
  userName: string;
  userEmail: string;
  amount: number;
  dueDate: string;
  paymentLink: string;
  template: NotificationTemplateType;
  seasonYear?: number;
  refundAmount?: number | string;
  processedDate?: string;
  totalCollected?: number | string;
  totalExpenses?: number | string;
  totalRefunds?: number | string;
}

const formatDate = (date: string): string => {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

const resolveSeasonYear = (params: Pick<PaymentNotificationParams, "seasonYear" | "dueDate">): number => {
  if (typeof params.seasonYear === "number" && Number.isFinite(params.seasonYear)) return params.seasonYear;
  const parsed = new Date(params.dueDate);
  return Number.isNaN(parsed.getTime()) ? new Date().getFullYear() : parsed.getFullYear();
};

const formatMoneyLike = (value?: number | string): string => {
  if (value === undefined || value === null || value === "") return "TBD";
  if (typeof value === "number" && Number.isFinite(value)) return `$${value.toFixed(2)}`;
  return String(value);
};

const getTemplateContent = (
  template: NotificationTemplateType,
  params: {
    amount: number;
    dueDate: string;
    paymentLink: string;
    seasonYear: number;
    refundAmount?: number | string;
    processedDate?: string;
    totalCollected?: number | string;
    totalExpenses?: number | string;
    totalRefunds?: number | string;
  }
): string => {
  const { amount, dueDate, paymentLink, seasonYear } = params;
  const formattedDate = formatDate(dueDate);
  const refundAmount = formatMoneyLike(params.refundAmount);
  const processedDate = params.processedDate ? formatDate(params.processedDate) : "TBD";
  const totalCollected = formatMoneyLike(params.totalCollected);
  const totalExpenses = formatMoneyLike(params.totalExpenses);
  const totalRefunds = formatMoneyLike(params.totalRefunds);

  switch (template) {
    case "payment-request":
      return `
        <p class="info-text">
          We hope this message finds you well! As we prepare for an exciting <span class="highlight">${seasonYear} season</span>
          with Starks Cricket, we kindly request your registration fee payment.
        </p>

        <div class="payment-box">
          <div style="font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #3b82f6; font-weight: 600;">
            Registration Fee
          </div>
          <div class="amount">$${amount}</div>
          <div class="due-date">Due Date: ${formattedDate}</div>
        </div>

        <center>
          <a href="${paymentLink}" class="cta-button">
            Pay Now - Secure Payment
          </a>
        </center>

        <div class="refund-policy">
          <h3>Important: Refund Policy</h3>
          <p style="color: #047857; margin: 12px 0;">
            All registration fees will be held to cover operational expenses for the ${seasonYear} season.
          </p>
          <ul>
            <li><strong>Equipment purchases</strong> (bats, balls, protective gear)</li>
            <li><strong>Venue bookings</strong> for practice and matches</li>
            <li><strong>Tournament registration fees</strong></li>
            <li><strong>Insurance and administrative costs</strong></li>
          </ul>
          <p style="color: #047857; margin: 12px 0;">
            Once all expenses are settled by <strong>year-end</strong>, any remaining funds will be
            <strong>refunded proportionally</strong> to all paid members.
          </p>
          <p style="font-size: 14px; color: #065f46; margin-top: 16px;">
            Expected refund processing: <strong>December ${seasonYear}</strong><br>
            You'll receive email notification when refunds are processed<br>
            Refund amount depends on total expenses vs. collected fees
          </p>
        </div>

        <p class="info-text">
          Please complete your payment by <strong>${formattedDate}</strong> to secure your spot for the ${seasonYear} season.
        </p>

        <p class="info-text">
          Thank you for your continued support and understanding!
        </p>
      `;

    case "payment-reminder":
      return `
        <p class="info-text">
          This is a friendly reminder that your <span class="highlight">${seasonYear} Starks Cricket registration fee</span>
          payment is still pending.
        </p>

        <div class="payment-box">
          <div style="font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #f59e0b; font-weight: 600;">
            Payment Pending
          </div>
          <div class="amount" style="color: #d97706;">$${amount}</div>
          <div class="due-date" style="color: #f59e0b;">Due: ${formattedDate}</div>
        </div>

        <center>
          <a href="${paymentLink}" class="cta-button">
            Pay Now
          </a>
        </center>

        <p class="info-text">
          Do not miss out on the ${seasonYear} season. Please complete your payment at your earliest convenience.
        </p>

        <p class="info-text" style="font-size: 14px; color: #6b7280;">
          <strong>Remember:</strong> Refunds will be processed at year-end after all expenses are covered.
        </p>
      `;

    case "refund-info":
      return `
        <p class="info-text">
          Thank you for your <span class="highlight">${seasonYear} registration fee payment</span>!
          This email confirms our refund policy for the season.
        </p>

        <div class="refund-policy">
          <h3>Refund Policy Details</h3>
          <ul>
            <li>All registration fees are used to cover ${seasonYear} operational expenses</li>
            <li>Expenses include: equipment, venue rentals, tournament fees, insurance, etc.</li>
            <li>At year-end (December ${seasonYear}), we will calculate total expenses vs. collected fees</li>
            <li>If there are remaining funds, refunds will be processed proportionally</li>
            <li>You will receive email notification with refund details</li>
          </ul>
        </div>

        <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin: 24px 0;">
          <h3 style="margin-top: 0; color: #1e40af; font-size: 16px;">Timeline</h3>
          <p style="color: #3b82f6; margin: 8px 0;"><strong>Now - Mid ${seasonYear}:</strong> Registration fees collected</p>
          <p style="color: #3b82f6; margin: 8px 0;"><strong>Throughout ${seasonYear}:</strong> Operational expenses paid</p>
          <p style="color: #3b82f6; margin: 8px 0;"><strong>December ${seasonYear}:</strong> Final expense calculation</p>
          <p style="color: #3b82f6; margin: 8px 0;"><strong>End of December ${seasonYear}:</strong> Refunds processed (if applicable)</p>
        </div>

        <p class="info-text">
          We are committed to transparency and will share expense reports with all members.
        </p>

        <p class="info-text">
          Thank you for being part of Starks Cricket!
        </p>
      `;

    case "refund-processed":
      return `
        <p class="info-text" style="font-size: 18px; font-weight: 600; color: #059669;">
          Great news! We have completed our ${seasonYear} expense reconciliation and processed your refund.
        </p>

        <div style="background-color: #ecfdf5; border: 2px solid #10b981; border-radius: 8px; padding: 24px; margin: 24px 0; text-align: center;">
          <div style="font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #059669; font-weight: 600;">
            Refund Amount
          </div>
          <div style="font-size: 42px; font-weight: bold; color: #047857; margin: 10px 0;">
            ${refundAmount}
          </div>
          <div style="font-size: 14px; color: #059669; margin-top: 8px;">
            Processed on: ${processedDate}
          </div>
        </div>

        <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 24px 0;">
          <h3 style="margin-top: 0; color: #374151; font-size: 16px;">Expense Summary</h3>
          <p style="color: #6b7280; margin: 8px 0;">Total Registration Fees Collected: ${totalCollected}</p>
          <p style="color: #6b7280; margin: 8px 0;">Total Operational Expenses: ${totalExpenses}</p>
          <p style="color: #6b7280; margin: 8px 0;">Total Refunds Distributed: ${totalRefunds}</p>
        </div>

        <p class="info-text">
          Your refund has been processed via the same payment method you used for registration.
          Please allow 3-5 business days for the funds to appear in your account.
        </p>

        <p class="info-text">
          Thank you for your patience and for being a valued member of Starks Cricket.
        </p>

        <p class="info-text" style="font-weight: 600; color: #3b82f6;">
          We look forward to seeing you in the ${seasonYear + 1} season.
        </p>
      `;

    default:
      return "";
  }
};

const getEmailHTML = (params: PaymentNotificationParams): string => {
  const { userName, amount, dueDate, paymentLink, template } = params;
  const seasonYear = resolveSeasonYear(params);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Starks Cricket - ${template}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      background-color: #f9fafb;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
      color: #ffffff;
      padding: 40px 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: bold;
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 20px;
    }
    .payment-box {
      background-color: #eff6ff;
      border: 2px solid #3b82f6;
      border-radius: 8px;
      padding: 24px;
      margin: 24px 0;
      text-align: center;
    }
    .payment-box .amount {
      font-size: 36px;
      font-weight: bold;
      color: #1e40af;
      margin: 10px 0;
    }
    .payment-box .due-date {
      font-size: 16px;
      color: #3b82f6;
      margin-top: 8px;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
      color: #ffffff !important;
      text-decoration: none;
      padding: 16px 40px;
      border-radius: 8px;
      font-weight: bold;
      font-size: 18px;
      margin: 24px 0;
      text-align: center;
    }
    .refund-policy {
      background-color: #f0fdf4;
      border-left: 4px solid #10b981;
      padding: 20px;
      margin: 24px 0;
      border-radius: 4px;
    }
    .refund-policy h3 {
      margin-top: 0;
      color: #065f46;
      font-size: 16px;
    }
    .refund-policy ul {
      margin: 12px 0;
      padding-left: 20px;
    }
    .refund-policy li {
      margin: 8px 0;
      color: #047857;
    }
    .info-text {
      color: #4b5563;
      font-size: 15px;
      line-height: 1.8;
      margin: 16px 0;
    }
    .footer {
      background-color: #f9fafb;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
    }
    .footer p {
      margin: 8px 0;
      color: #6b7280;
      font-size: 14px;
    }
    .highlight {
      background-color: #fef3c7;
      padding: 2px 8px;
      border-radius: 4px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Starks Cricket</h1>
    </div>

    <div class="content">
      <p class="greeting">Dear ${userName},</p>
      ${getTemplateContent(template, {
        amount,
        dueDate,
        paymentLink,
        seasonYear,
        refundAmount: params.refundAmount,
        processedDate: params.processedDate,
        totalCollected: params.totalCollected,
        totalExpenses: params.totalExpenses,
        totalRefunds: params.totalRefunds,
      })}
    </div>

    <div class="footer">
      <p><strong>Starks Cricket</strong></p>
      <p>Questions? Email us at <a href="mailto:starks.cricket@thetcl.org">starks.cricket@thetcl.org</a></p>
      <p style="margin-top: 20px; font-size: 12px; color: #9ca3af;">
        © ${new Date().getFullYear()} Starks Cricket. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
  `;
};

const getPlainTextContent = (params: PaymentNotificationParams): string => {
  const { userName, amount, dueDate, paymentLink, template } = params;
  const formattedDate = formatDate(dueDate);
  const seasonYear = resolveSeasonYear(params);

  switch (template) {
    case "payment-request":
      return `Dear ${userName},

Please complete your ${seasonYear} Starks Cricket registration fee payment.

Amount: $${amount}
Due Date: ${formattedDate}
Payment Link: ${paymentLink}

Important: Registration fees cover ${seasonYear} operational expenses. Any remaining funds after year-end reconciliation will be refunded proportionally to paid members.

Expected refund processing: December ${seasonYear}.

Questions: starks.cricket@thetcl.org
`;
    case "payment-reminder":
      return `Dear ${userName},

Friendly reminder: your ${seasonYear} Starks Cricket registration fee payment is still pending.

Amount: $${amount}
Due Date: ${formattedDate}
Payment Link: ${paymentLink}

Refunds are processed at year-end after expenses are covered.

Questions: starks.cricket@thetcl.org
`;
    case "refund-info":
      return `Dear ${userName},

Thank you for your ${seasonYear} registration fee payment.
This message confirms our refund policy:
- Fees are used for ${seasonYear} operational expenses.
- Final reconciliation happens in December ${seasonYear}.
- Remaining funds are refunded proportionally.

Questions: starks.cricket@thetcl.org
`;
    case "refund-processed":
      return `Dear ${userName},

Great news. Your Starks Cricket ${seasonYear} refund has been processed.
Please allow 3-5 business days for settlement.

Questions: starks.cricket@thetcl.org
`;
    default:
      return `Dear ${userName},\n\nStarks Cricket notification.\n`;
  }
};

export const getSubject = (template: NotificationTemplateType, amount: number): string => {
  const seasonYear = new Date().getFullYear();
  switch (template) {
    case "payment-request":
      return `${seasonYear} Starks Cricket Registration Fee ($${amount}) - Action Required`;
    case "payment-reminder":
      return `Reminder: ${seasonYear} Registration Fee Payment Pending`;
    case "refund-info":
      return `Starks Cricket ${seasonYear} - Refund Policy Information`;
    case "refund-processed":
      return `Starks Cricket ${seasonYear} - Refund Processed`;
    default:
      return "Starks Cricket Notification";
  }
};

// Manual/draft-mode implementation entrypoint.
export const sendPaymentNotificationEmail = async (
  params: PaymentNotificationParams
): Promise<boolean> => {
  try {
    const email: EmailParams = {
      to: params.userEmail,
      toName: params.userName,
      subject: getSubject(params.template, params.amount),
      htmlContent: getEmailHTML(params),
      textContent: getPlainTextContent(params),
    };

    // TODO: Integrate a provider later (Resend/Mailgun/SES/etc) in API route/Cloud Function:
    // await provider.send({
    //   to: email.to,
    //   from: "starks.cricket@thetcl.org",
    //   subject: email.subject,
    //   html: email.htmlContent,
    //   text: email.textContent,
    // });

    console.log(`[emailService] queued ${email.subject} -> ${email.to}`);
    return true;
  } catch (error) {
    console.error("[emailService] Failed to send email:", error);
    return false;
  }
};

export const sendBulkPaymentNotifications = async (
  recipients: Array<{ userName: string; userEmail: string }>,
  amount: number,
  dueDate: string,
  paymentLink: string,
  template: NotificationTemplateType
): Promise<{ success: number; failed: number }> => {
  let success = 0;
  let failed = 0;

  const batchSize = 10;

  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);

    const results = await Promise.all(
      batch.map((recipient) =>
        sendPaymentNotificationEmail({
          userName: recipient.userName,
          userEmail: recipient.userEmail,
          amount,
          dueDate,
          paymentLink,
          template,
        })
      )
    );

    success += results.filter(Boolean).length;
    failed += results.filter((result) => !result).length;

    if (i + batchSize < recipients.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return { success, failed };
};
