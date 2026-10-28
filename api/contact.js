// Vercel serverless function: emails quote requests to the business.
// Set these in Vercel → Project → Settings → Environment Variables:
//   SMTP_USER  (e.g. a Gmail address)   SMTP_PASS (Gmail app password)
//   TO_EMAIL   (where requests go; defaults to SMTP_USER)
// Without them the endpoint runs in demo mode and just logs the request.
const nodemailer = require('nodemailer');

const esc = s => String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  if (b.company) return res.status(200).json({ ok: true }); // honeypot
  if (!b.name || !b.phone || !b.vehicle) return res.status(400).json({ ok: false, error: 'Name, phone and vehicle are required' });

  const rows = [
    ['Name', b.name], ['Phone', b.phone], ['Email', b.email], ['Vehicle', b.vehicle], ['Size', b.size],
    ['Interested in', Array.isArray(b.interest) ? b.interest.join(', ') : b.interest],
    ['City', b.city], ['Reach by', b.reach], ['Message', b.message]
  ].filter(([, v]) => v);

  const { SMTP_USER, SMTP_PASS, TO_EMAIL } = process.env;
  if (!SMTP_USER || !SMTP_PASS) {
    console.log('[demo] quote request', rows);
    return res.status(200).json({ ok: true, demo: true });
  }
  try {
    const t = nodemailer.createTransport({ service: 'gmail', auth: { user: SMTP_USER, pass: SMTP_PASS } });
    await t.sendMail({
      from: `"Premier Website" <${SMTP_USER}>`,
      to: TO_EMAIL || SMTP_USER,
      replyTo: b.email || undefined,
      subject: `Quote request: ${b.vehicle} (${b.name})`,
      text: rows.map(([k, v]) => `${k}: ${v}`).join('\n'),
      html: `<table cellpadding="6" style="font-family:Arial,sans-serif;font-size:14px">${rows.map(([k, v]) => `<tr><td style="color:#667"><b>${esc(k)}</b></td><td>${esc(v).replace(/\n/g, '<br>')}</td></tr>`).join('')}</table>`
    });
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: 'Email failed' });
  }
};
