
import nodemailer from "nodemailer";

const getSmtpConfig = () => {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM?.trim();

  if (
    !host ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535 ||
    !user ||
    !pass ||
    !from
  ) {
    return null;
  }

  return {
    host,
    port,
    secure:
      process.env.SMTP_SECURE === "true" || port === 465,
    auth: { user, pass },
    from,
  };
};

export const isTenantEmailConfigured = () =>
  Boolean(getSmtpConfig());

export const sendTenantPasswordResetEmail = async ({
  to,
  instituteName,
  resetUrl,
}) => {
  const config = getSmtpConfig();

  if (!config) {
    throw new Error("TENANT_EMAIL_NOT_CONFIGURED");
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
  });

  await transporter.sendMail({
    from: config.from,
    to,
    subject: `Reset your ${instituteName} account password`,
    text: [
      `Hello,`,
      ``,
      `A password reset was requested for your ${instituteName} account.`,
      ``,
      `Use the following link to reset your password:`,
      resetUrl,
      ``,
      `This link expires in 15 minutes and can only be used once.`,
      `If you did not request this, you can ignore this email.`,
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#222">
        <h2>Password reset</h2>
        <p>A password reset was requested for your
          <strong>${escapeHtml(instituteName)}</strong> account.</p>
        <p>
          <a href="${escapeHtml(resetUrl)}"
             style="display:inline-block;padding:12px 20px;
                    background:#2457d6;color:#fff;
                    text-decoration:none;border-radius:6px">
            Reset password
          </a>
        </p>
        <p>This link expires in 15 minutes and can only be used once.</p>
        <p>If you did not request this, you can ignore this email.</p>
      </div>
    `,
  });
};

const escapeHtml = (value = "") =>
  String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[character];
  });
