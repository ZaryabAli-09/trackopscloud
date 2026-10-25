import nodemailer, { type Transporter } from "nodemailer";
import { serverEnv } from "@/config/app.config";
import { appConfig } from "@/config/app.config";

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (transporter) return transporter;

  if (!serverEnv.SMTP_HOST || !serverEnv.SMTP_USER || !serverEnv.SMTP_PASS) {
    throw new Error("SMTP is not configured");
  }

  transporter = nodemailer.createTransport({
    host: serverEnv.SMTP_HOST,
    port: parseInt(serverEnv.SMTP_PORT || "587", 10),
    secure: parseInt(serverEnv.SMTP_PORT || "587", 10) === 465,
    auth: {
      user: serverEnv.SMTP_USER,
      pass: serverEnv.SMTP_PASS,
    },
  });

  return transporter;
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  const smtpConfigured =
    serverEnv.SMTP_HOST && serverEnv.SMTP_USER && serverEnv.SMTP_PASS;

  if (!smtpConfigured) {
    console.warn("⚠️ SMTP not configured - email would be sent:", options.subject, "to", options.to);
    return;
  }

  try {
    const transport = getTransporter();
    await transport.sendMail({
      from: serverEnv.SMTP_FROM || `"TrackOpsCloud" <noreply@trackopscloud.example.com>`,
      to: options.to,
      subject: `[${appConfig.name}] ${options.subject}`,
      html: options.html,
      text: options.text,
    });
  } catch (error) {
    console.error("Email sending failed:", error);
    throw new Error("Failed to send email");
  }
}

export function applicationReceivedEmail(companyName: string, to: string): EmailOptions {
  return {
    to,
    subject: "Application Received",
    html: `
      <h2>Thank you for registering with TrackOpsCloud</h2>
      <p>Dear ${companyName} team,</p>
      <p>We have received your company registration application. Our team will review it and get back to you shortly.</p>
      <p>You will receive another email once your application is approved.</p>
      <br />
      <p>Best regards,<br />The TrackOpsCloud Team</p>
    `,
    text: `Thank you for registering with TrackOpsCloud. We have received your application for ${companyName}. Our team will review it and get back to you shortly.`,
  };
}

export function companyApprovedEmail(companyName: string, to: string, setupUrl: string): EmailOptions {
  return {
    to,
    subject: "Your TrackOpsCloud Account is Approved",
    html: `
      <h2>Congratulations!</h2>
      <p>Dear ${companyName} team,</p>
      <p>Your company registration has been <strong>approved</strong>.</p>
      <p>Click the button below to set up your administrator password and access your dashboard:</p>
      <p><a href="${setupUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Set Up Your Password</a></p>
      <p>This link is valid for 24 hours and can only be used once.</p>
      <br />
      <p>Best regards,<br />The TrackOpsCloud Team</p>
    `,
    text: `Congratulations! Your company registration for ${companyName} has been approved. Visit ${setupUrl} to set up your administrator password. This link is valid for 24 hours and can only be used once.`,
  };
}

export function companyRejectedEmail(companyName: string, to: string, reason?: string | null): EmailOptions {
  return {
    to,
    subject: "TrackOpsCloud Application Update",
    html: `
      <h2>Application Update</h2>
      <p>Dear ${companyName} team,</p>
      <p>After review, we regret to inform you that your company registration has been <strong>rejected</strong>.</p>
      ${reason ? `<p>Reason: ${reason}</p>` : ""}
      <p>If you believe this is an error, please contact support.</p>
      <br />
      <p>Best regards,<br />The TrackOpsCloud Team</p>
    `,
    text: `Your company registration for ${companyName} has been rejected. ${reason ? `Reason: ${reason} ` : ""}Contact support if you believe this is an error.`,
  };
}

export function companySuspendedEmail(companyName: string, to: string, reason?: string | null): EmailOptions {
  return {
    to,
    subject: "TrackOpsCloud Account Suspended",
    html: `
      <h2>Account Suspended</h2>
      <p>Dear ${companyName} team,</p>
      <p>Your TrackOpsCloud account has been <strong>suspended</strong>.</p>
      ${reason ? `<p>Reason: ${reason}</p>` : ""}
      <p>Please contact support for more information.</p>
      <br />
      <p>Best regards,<br />The TrackOpsCloud Team</p>
    `,
    text: `Your TrackOpsCloud account for ${companyName} has been suspended. ${reason ? `Reason: ${reason} ` : ""}Contact support for more information.`,
  };
}

export function companyReactivatedEmail(companyName: string, to: string): EmailOptions {
  return {
    to,
    subject: "TrackOpsCloud Account Reactivated",
    html: `
      <h2>Account Reactivated</h2>
      <p>Dear ${companyName} team,</p>
      <p>Your TrackOpsCloud account has been <strong>reactivated</strong>. You can now access your dashboard.</p>
      <br />
      <p>Best regards,<br />The TrackOpsCloud Team</p>
    `,
    text: `Your TrackOpsCloud account for ${companyName} has been reactivated. You can now access your dashboard.`,
  };
}

export function passwordResetEmail(to: string, resetUrl: string): EmailOptions {
  return {
    to,
    subject: "Reset Your TrackOpsCloud Password",
    html: `
      <h2>Password Reset</h2>
      <p>You requested a password reset for your TrackOpsCloud account.</p>
      <p>Click the button below to reset your password:</p>
      <p><a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Reset Password</a></p>
      <p>This link is valid for 1 hour and can only be used once.</p>
      <br />
      <p>Best regards,<br />The TrackOpsCloud Team</p>
    `,
    text: `You requested a password reset for your TrackOpsCloud account. Visit ${resetUrl} to reset your password. This link is valid for 1 hour and can only be used once.`,
  };
}

export function employeeInvitationEmail(
  companyName: string,
  to: string,
  invitedBy: string,
  invitationUrl: string
): EmailOptions {
  return {
    to,
    subject: "Invitation to Join TrackOpsCloud",
    html: `
      <h2>You're Invited</h2>
      <p>You have been invited by ${invitedBy} to join ${companyName} on TrackOpsCloud as an employee.</p>
      <p>Click the button below to accept the invitation:</p>
      <p><a href="${invitationUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Accept Invitation</a></p>
      <p>This link is valid for 7 days and can only be used once.</p>
      <br />
      <p>Best regards,<br />The TrackOpsCloud Team</p>
    `,
    text: `You have been invited by ${invitedBy} to join ${companyName} on TrackOpsCloud as an employee. Visit ${invitationUrl} to accept. This link is valid for 7 days and can only be used once.`,
  };
}