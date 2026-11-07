import nodemailer from "nodemailer";

const NOREPLY_USER = process.env.NOREPLY_EMAIL || "noreply@kadokunn.com";
const NOREPLY_PASS = process.env.NOREPLY_PASSWORD || "kado123arashi";

export async function sendVerificationEmail(toEmail, code, name = "Developer") {
  const transporter = nodemailer.createTransport({
    host: "mail.ruang.email",
    port: 465,
    secure: true,
    auth: {
      user: NOREPLY_USER,
      pass: NOREPLY_PASS
    }
  });

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 28px 24px; border: 1px solid #e4e4e7; border-radius: 12px; background: #ffffff; color: #18181b;">
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="font-size: 28px; line-height: 1;">✨</span>
        <h2 style="margin: 8px 0 0; color: #f25c05; font-size: 22px; font-weight: 800;">Arashi Api's</h2>
        <p style="margin: 4px 0 0; font-size: 13px; color: #71717a;">Kode Verifikasi Pendaftaran Akun</p>
      </div>
      <p style="font-size: 15px; line-height: 1.5; margin: 0 0 12px;">Halo <b>${name}</b>,</p>
      <p style="font-size: 14px; line-height: 1.6; color: #3f3f46; margin: 0 0 20px;">
        Terima kasih telah mendaftar di <b>Arashi Api's</b>. Masukkan 6 digit kode verifikasi berikut untuk mengaktifkan akun kamu:
      </p>
      <div style="text-align: center; margin: 28px 0;">
        <div style="display: inline-block; font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #f25c05; padding: 14px 28px; background: #fff7ed; border: 2px dashed #fdba74; border-radius: 10px;">
          ${code}
        </div>
      </div>
      <p style="font-size: 13px; color: #71717a; line-height: 1.5; margin: 0 0 24px;">
        Kode verifikasi ini hanya berlaku selama <b>10 menit</b>. Demi keamanan akunmu, jangan bagikan kode ini kepada siapa pun.
      </p>
      <hr style="border: none; border-top: 1px solid #f4f4f5; margin: 20px 0;" />
      <p style="font-size: 12px; color: #a1a1aa; text-align: center; margin: 0;">
        © 2026 Arashi Api's by Kadokun · Kontak: <a href="mailto:admin@kadokunn.com" style="color: #f25c05; text-decoration: none;">admin@kadokunn.com</a>
      </p>
    </div>
  `;

  return await transporter.sendMail({
    from: '"Arashi APIs" <noreply@kadokunn.com>',
    to: toEmail,
    subject: `${code} adalah kode verifikasi Arashi API kamu`,
    text: `Kode verifikasi pendaftaran Arashi API kamu adalah: ${code}. Berlaku selama 10 menit.`,
    html
  });
}
