// Outbound helpdesk reply — sent from the admin backoffice reply drawer
// (app/admin/reports) in answer to an inbound 'source: email' report.
// Structure mirrors verification.ts (table-based inline-styled, Outlook/
// Gmail/dark-mode safe), kept intentionally plain — this is a support reply,
// not a marketing email.
export function buildReportReplyEmailHtml(opts: {
  bodyText: string
  attachments: { url: string; kind: 'image' | 'video' }[]
}): string {
  const { bodyText, attachments } = opts
  const logoUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://gizku.com'}/gizku-logo-email.jpg?v=2`

  const bodyHtml = escapeHtml(bodyText).split('\n').map(line => `<p style="margin:0 0 12px 0;">${line || '&nbsp;'}</p>`).join('')

  const attachmentsHtml = attachments.length ? `
          <tr>
            <td style="padding:8px 40px 0 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr><td style="border-top:1px solid #e7dcc7; font-size:1px; line-height:1px;">&nbsp;</td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 40px 0 40px; font-family: Arial, Helvetica, sans-serif; font-size:13px; line-height:1.6; color:#6b5c4a;">
              <p style="margin:0 0 8px 0; font-weight:600; color:#241e19;">Lampiran:</p>
              ${attachments.map((a, i) => `<p style="margin:0 0 4px 0;"><a href="${a.url}" style="color:#305f29;">${a.kind === 'video' ? 'Video' : 'Foto'} ${i + 1}</a></p>`).join('')}
            </td>
          </tr>` : ''

  return `<!DOCTYPE html>
<html lang="id" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Balasan dari Tim Gizku</title>
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
    Tim Gizku membalas laporan yang kamu kirim.
  </span>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="bg-page" style="background-color:#faf6ef;">
    <tr>
      <td align="center" style="padding:40px 16px;">

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="bg-card border-card" style="width:600px; max-width:600px; background-color:#ffffff; border-radius:16px; border:1px solid #e7dcc7;">
          <tr>
            <td align="center" style="padding:36px 40px 20px 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" valign="middle" style="width:44px; height:44px;">
                    <img src="${logoUrl}" width="44" height="44" alt="Gizku" style="display:block; width:44px; height:44px; border-radius:12px;">
                  </td>
                  <td style="width:10px;">&nbsp;</td>
                  <td valign="middle" style="font-family: Arial, Helvetica, sans-serif; font-size:20px; font-weight:600; color:#241e19; letter-spacing:-0.2px;" class="text-primary">
                    Gizku Support
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:8px 40px 0 40px;">
              <p style="margin:0; font-family: Arial, Helvetica, sans-serif; font-size:20px; line-height:1.4; font-weight:600; color:#241e19;" class="text-primary">
                Balasan untuk laporanmu
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:16px 40px 0 40px; font-family: Arial, Helvetica, sans-serif; font-size:15px; line-height:1.6; color:#6b5c4a;" class="text-secondary">
              ${bodyHtml}
            </td>
          </tr>
          ${attachmentsHtml}

          <tr>
            <td style="padding:28px 40px 0 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr><td style="border-top:1px solid #e7dcc7; font-size:1px; line-height:1px;" class="border-card">&nbsp;</td></tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:20px 40px 36px 40px; font-family: Arial, Helvetica, sans-serif; font-size:13px; line-height:1.6; color:#b7a382;">
              Balas email ini kalau masih ada yang perlu ditambahkan — akan langsung masuk ke thread yang sama.
            </td>
          </tr>
        </table>

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:600px;">
          <tr>
            <td align="center" style="padding:24px 24px 0 24px; font-family: Arial, Helvetica, sans-serif; font-size:12px; line-height:1.6; color:#b7a382;">
              Tim Gizku · <a href="mailto:support@gizku.com" class="plain-link" style="color:#8a7862; text-decoration:underline;">support@gizku.com</a>
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
