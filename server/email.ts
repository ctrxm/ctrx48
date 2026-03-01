import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "mail.cyberpersons.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.SMTP_USER || "noreply@ctrxl.id",
    pass: process.env.SMTP_PASS,
  },
});

export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendOtpEmail(to: string, code: string): Promise<void> {
  const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@ctrxl.id";

  await transporter.sendMail({
    from: `"CTRXL48" <${fromAddress}>`,
    to,
    replyTo: fromAddress,
    subject: `Kode Verifikasi CTRXL48: ${code}`,
    headers: {
      "X-Mailer": "CTRXL48",
      "X-Priority": "3",
      "Precedence": "bulk",
    },
    text: `CTRXL48 - Kode Verifikasi\n\nKode verifikasi kamu: ${code}\n\nKode ini berlaku selama 10 menit.\nJika kamu tidak meminta kode ini, abaikan email ini.\n\nSalam,\nTim CTRXL48\nhttps://ctrxl48.com`,
    html: `<!DOCTYPE html>
<html lang="id">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #ffffff;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff;">
<tr><td align="center" style="padding: 40px 20px;">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width: 480px; width: 100%;">
  <tr><td style="text-align: center; padding-bottom: 24px;">
    <h1 style="font-family: Arial, sans-serif; font-size: 20px; font-weight: 700; color: #1a1a1a; margin: 0 0 4px;">CTRXL48</h1>
    <p style="font-family: Arial, sans-serif; color: #666666; font-size: 14px; margin: 0;">Verifikasi Email</p>
  </td></tr>
  <tr><td style="background-color: #f8f9fa; border-radius: 12px; padding: 24px; text-align: center;">
    <p style="font-family: Arial, sans-serif; color: #666666; font-size: 14px; margin: 0 0 12px;">Kode verifikasi kamu:</p>
    <p style="font-family: monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #7c3aed; margin: 0;">${code}</p>
  </td></tr>
  <tr><td style="padding-top: 20px; text-align: center;">
    <p style="font-family: Arial, sans-serif; color: #999999; font-size: 12px; margin: 0;">Kode ini berlaku selama 10 menit. Jika kamu tidak meminta kode ini, abaikan email ini.</p>
  </td></tr>
  <tr><td style="padding-top: 24px; text-align: center; border-top: 1px solid #eeeeee;">
    <p style="font-family: Arial, sans-serif; color: #bbbbbb; font-size: 11px; margin: 8px 0 0;">CTRXL48 &mdash; Forum Ephemeral Indonesia</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`,
  });
}
