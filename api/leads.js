// api/leads.js
module.exports = async (req, res) => {
  // --- CORS ---
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-token');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  // --- Auth ---
  const token = req.headers['x-api-token'];
  if (!process.env.ACTION_TOKEN) {
    res.status(500).json({ error: 'server_misconfig', hint: 'ACTION_TOKEN is not set' });
    return;
  }
  if (token !== process.env.ACTION_TOKEN) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  try {
    const {
      name,
      contact,
      service,
      budget,
      business_size,
      city,
      urgency_days,
      notes,
      consent
    } = req.body || {};

    // --- Validate consent ---
    const consentBool =
      consent === true ||
      consent === 'true' ||
      consent === 1 ||
      consent === '1' ||
      consent === 'yes';

    if (!consentBool) {
      res.status(400).json({ error: 'consent_required' });
      return;
    }

    const score = scoreLead({
      service,
      budget,
      urgency_days,
      business_size,
      contact,
      notes
    });

    const lead_id = `W-${Date.now()}`;

    // TODO: احفظ البيانات في Google Sheet/Airtable/قاعدة بيانات
    res.status(200).json({ lead_id, score });
  } catch (e) {
    console.error('leads_error:', e);
    res.status(500).json({ error: 'server_error' });
  }
};

function scoreLead(p) {
  let score = 0;

  const service = (p.service || '').toLowerCase();
  if (['branding', 'social_media_mgmt', 'ads_campaign', 'visual_identity', 'content_strategy'].includes(service)) {
    score += 20;
  }

  const budgetNorm = (p.budget || '').toString().trim();
  if (budgetNorm === '>=600$' || budgetNorm === '300-600$' || budgetNorm === '≥600$') {
    score += 25;
  } else if (budgetNorm === '150-300$') {
    score += 15;
  }

  const urgency = Number(p.urgency_days);
  if (!isNaN(urgency)) {
    if (urgency <= 3) score += 20;
    else if (urgency <= 7) score += 10;
  }

  const biz = (p.business_size || '').toLowerCase();
  if (['sme', 'company', 'org', 'ngo'].includes(biz)) score += 10;

  const hasWhatsApp = typeof p.contact === 'string' && /(\+?\d{8,})/.test(p.contact);
  if (hasWhatsApp) score += 10;

  const notesLen = (p.notes || '').trim().length;
  if (notesLen >= 50) score += 5;

  return score;
}
