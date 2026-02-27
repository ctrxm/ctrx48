import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "mail.cyberpersons.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendOtpEmail(to: string, code: string): Promise<void> {
  await transporter.sendMail({
    from: `"CTRXL48" <${process.env.SMTP_USER}@cyberpersons.com>`,
    to,
    subject: "Your CTRXL48 Verification Code",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="display: inline-block; width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #f97316, #ec4899); line-height: 48px; font-size: 24px;">🔥</div>
          <h1 style="font-size: 20px; font-weight: 700; color: #1a1a1a; margin: 16px 0 4px;">CTRXL48</h1>
          <p style="color: #666; font-size: 14px; margin: 0;">Email Verification</p>
        </div>
        <div style="background: #f8f9fa; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <p style="color: #666; font-size: 14px; margin: 0 0 12px;">Your verification code:</p>
          <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #f97316; font-family: monospace;">${code}</div>
        </div>
        <p style="color: #999; font-size: 12px; text-align: center;">This code expires in 10 minutes. If you didn't request this, ignore this email.</p>
      </div>
    `,
  });
}
