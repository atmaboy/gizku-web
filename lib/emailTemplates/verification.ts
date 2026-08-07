// Adaptasi dari desain "Email Verifikasi Gizku.html" (attachment) — struktur
// table-based inline-styled email dipertahankan persis (kompatibel Outlook/
// Gmail/dark-mode via prefers-color-scheme), copy diterjemahkan ke Bahasa
// Indonesia dan placeholder diganti jadi interpolasi.
export function buildVerificationEmailHtml(opts: {
  username: string
  verifyUrl: string
  expiryHours: number
}): string {
  const { username, verifyUrl, expiryHours } = opts
  // Query param busts Gmail/Outlook's image proxy cache, which caches by
  // exact URL — bump this whenever gizku-logo-email.jpg is replaced.
  const logoUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://gizku.com'}/gizku-logo-email.jpg?v=2`

  return `<!DOCTYPE html>
<html lang="id" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Verifikasi email Gizku kamu</title>
<!--[if mso]>
<noscript>
<xml>
<o:OfficeDocumentSettings>
<o:PixelsPerInch>96</o:PixelsPerInch>
</o:OfficeDocumentSettings>
</xml>
</noscript>
<![endif]-->
<style>
  body, table, td { font-family: Arial, Helvetica, sans-serif; }
  body { margin:0; padding:0; width:100% !important; background-color:#faf6ef; }
  table { border-collapse: collapse; }
  img { border:0; line-height:100%; outline:none; text-decoration:none; }
  a.button-link:hover { background-color:#305f29 !important; }
  a.plain-link:hover { color:#254a20 !important; }
  @media (prefers-color-scheme: dark) {
    .bg-page { background-color:#241e19 !important; }
    .bg-card { background-color:#332b25 !important; }
    .text-primary { color:#f3ecdf !important; }
    .text-secondary { color:#d5c5a8 !important; }
    .border-card { border-color:#4a4038 !important; }
  }
</style>
</head>
<body style="margin:0; padding:0; background-color:#faf6ef;">
  <span style="display:none; font-size:1px; color:#faf6ef; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden; mso-hide:all;">
    Konfirmasi email kamu untuk menyelesaikan pendaftaran akun Gizku. Link ini berlaku ${expiryHours} jam.
  </span>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="bg-page" style="background-color:#faf6ef;">
    <tr>
      <td align="center" style="padding:40px 16px;">

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="bg-card border-card" style="width:600px; max-width:600px; background-color:#ffffff; border-radius:16px; border:1px solid #e7dcc7;">
          <!-- Header / logo -->
          <tr>
            <td align="center" style="padding:36px 40px 20px 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" valign="middle" style="width:44px; height:44px;">
                    <img src="${logoUrl}" width="44" height="44" alt="Gizku" style="display:block; width:44px; height:44px; border-radius:12px;">
                  </td>
                  <td style="width:10px;">&nbsp;</td>
                  <td valign="middle" style="font-family: Arial, Helvetica, sans-serif; font-size:20px; font-weight:600; color:#241e19; letter-spacing:-0.2px;" class="text-primary">
                    Gizku
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Heading -->
          <tr>
            <td align="center" style="padding:8px 40px 0 40px;">
              <p style="margin:0; font-family: Arial, Helvetica, sans-serif; font-size:20px; line-height:1.4; font-weight:600; color:#241e19;" class="text-primary">
                Verifikasi email kamu
              </p>
            </td>
          </tr>

          <!-- Body copy -->
          <tr>
            <td style="padding:16px 40px 0 40px; font-family: Arial, Helvetica, sans-serif; font-size:15px; line-height:1.6; color:#6b5c4a;" class="text-secondary">
              <p style="margin:0 0 16px 0;">Hai ${escapeHtml(username)},</p>
              <p style="margin:0 0 16px 0;">
                Terima kasih sudah bergabung dengan Gizku. Konfirmasi alamat email kamu untuk mengaktifkan verifikasi akun dan mulai melacak nutrisimu.
              </p>
            </td>
          </tr>

          <!-- CTA button -->
          <tr>
            <td align="center" style="padding:8px 40px 0 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" bgcolor="#3d7833" style="border-radius:10px; background-color:#3d7833;">
                    <a href="${verifyUrl}" class="button-link" style="display:block; padding:14px 32px; font-family: Arial, Helvetica, sans-serif; font-size:15px; font-weight:600; color:#ffffff; text-decoration:none; border-radius:10px; mso-line-height-rule:exactly; line-height:20px;">
                      Verifikasi email
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Expiry note -->
          <tr>
            <td align="center" style="padding:16px 40px 0 40px; font-family: Arial, Helvetica, sans-serif; font-size:13px; line-height:1.5; color:#b7a382;">
              Link ini berlaku selama ${expiryHours} jam.
            </td>
          </tr>

          <!-- Fallback raw link -->
          <tr>
            <td align="center" style="padding:20px 40px 0 40px; font-family: Arial, Helvetica, sans-serif; font-size:13px; line-height:1.5; color:#8a7862;" class="text-secondary">
              <p style="margin:0 0 6px 0;">Atau salin link berikut ke browser kamu:</p>
              <a href="${verifyUrl}" class="plain-link" style="color:#305f29; word-break:break-all;">${verifyUrl}</a>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:28px 40px 0 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr><td style="border-top:1px solid #e7dcc7; font-size:1px; line-height:1px;" class="border-card">&nbsp;</td></tr>
              </table>
            </td>
          </tr>

          <!-- Security note -->
          <tr>
            <td style="padding:20px 40px 36px 40px; font-family: Arial, Helvetica, sans-serif; font-size:13px; line-height:1.6; color:#b7a382;">
              Kalau kamu tidak membuat akun Gizku atau tidak meminta perubahan email ini, abaikan saja email ini — tidak ada perubahan yang akan terjadi pada akunmu.
            </td>
          </tr>
        </table>

        <!-- Footer -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:600px;">
          <tr>
            <td align="center" style="padding:24px 24px 0 24px; font-family: Arial, Helvetica, sans-serif; font-size:12px; line-height:1.6; color:#b7a382;">
              Butuh bantuan? Hubungi kami di <a href="mailto:support@gizku.com" class="plain-link" style="color:#8a7862; text-decoration:underline;">support@gizku.com</a>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:6px 24px 32px 24px; font-family: Arial, Helvetica, sans-serif; font-size:12px; line-height:1.6; color:#d5c5a8;">
              © 2026 Gizku. All rights reserved.
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>`
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}
