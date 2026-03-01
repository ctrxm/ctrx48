import nodemailer from "nodemailer";

const smtpHost = process.env.SMTP_HOST || "mail.cyberpersons.com";
const smtpPort = parseInt(process.env.SMTP_PORT || "465");
const smtpUser = process.env.SMTP_USER || "noreply@ctrxl.id";
const smtpFrom = process.env.SMTP_FROM || smtpUser;

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpPort === 465,
  auth: {
    user: smtpUser,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendOtpEmail(to: string, code: string): Promise<void> {
  await transporter.sendMail({
    from: `CTRXL48 <${smtpFrom}>`,
    to,
    subject: `${code} - Kode Verifikasi`,
    text: [
      `Halo,`,
      ``,
      `Kode verifikasi akun CTRXL48 kamu adalah: ${code}`,
      ``,
      `Kode ini berlaku selama 10 menit.`,
      `Jika kamu tidak merasa mendaftar di CTRXL48, abaikan email ini.`,
      ``,
      `Terima kasih,`,
      `Tim CTRXL48`,
    ].join("\n"),
    html: [
      `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:20px;">`,
      `<p style="font-size:14px;color:#333;">Halo,</p>`,
      `<p style="font-size:14px;color:#333;">Kode verifikasi akun CTRXL48 kamu adalah:</p>`,
      `<p style="font-size:28px;font-weight:bold;letter-spacing:6px;color:#333;text-align:center;padding:16px;background:#f5f5f5;border-radius:8px;">${code}</p>`,
      `<p style="font-size:13px;color:#666;">Kode ini berlaku selama 10 menit. Jika kamu tidak merasa mendaftar di CTRXL48, abaikan email ini.</p>`,
      `<p style="font-size:13px;color:#666;">Terima kasih,<br>Tim CTRXL48</p>`,
      `</div>`,
    ].join(""),
  });
}
