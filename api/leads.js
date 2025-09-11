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
      s
