// api/leads.js
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }
  const token = req.headers['x-api-token'];
  if (token !== process.env.ACTION_TOKEN) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  try {
    const {
      name, contact, service, budget,
      business_size, city, urgency_days, notes, consent
    } = req.body || {};

    if (!consent) {
      res.status(400).json({ error: 'consent_required' });
      return;
    }

    const score = scoreLead({
      service, budget, urgency_days, business_size, contact, notes
    });
    const lead_id = `W-${Date.now()}`;
    // TODO: خزّن هنا في قاعدة بيانات/Google Sheet/Airtable إن حبيت
    res.status(200).json({ lead_id, score });
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
};

function scoreLead(p) {
  let s = 0;
  const S = (p.service || '').toLowerCase();
  if (['branding','social_media_mgmt','ads_campaign','visual_identity','content_strategy'].includes(S)) s += 20;
  if (p.budget === '>600$' || p.budget === '300-600$') s += 25;
  else if (p.budget === '100-300$') s += 10;
  const u = parseInt(p.urgency_days || '999', 10);
  if (u <= 14) s += 15;
  if (['small','medium','org'].includes((p.business_size || '').toLowerCase())) s += 10;
  if (p.contact) s += 10;
  if ((p.notes || '').toLowerCase().includes('student')) s -= 10;
  return Math.max(0, Math.min(100, s));
}
