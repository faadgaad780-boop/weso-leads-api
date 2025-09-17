// api/chat.js
const OpenAI = require("openai");
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// دالة مساعدة لقراءة الـ body كـ raw إذا ما وصل جاهز
function readRawBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => resolve(data));
  });
}

module.exports = async (req, res) => {
  // فحص سريع للروت
  if (req.method === "GET") {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.status(200).json({ ok: true, route: "/api/chat", method: "GET" });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  try {
    // 1) نحاول نقرأ body بأي شكل
    let body = req.body;
    if (!body || typeof body === "string") {
      const raw = typeof body === "string" ? body : await readRawBody(req);
      try { body = raw ? JSON.parse(raw) : {}; } catch { body = {}; }
    }

    // 2) نقبل عدة أسماء للحقل + كويري سترنغ كخيار أخير
    const userMsg =
      (body && (body.message || body.user_message || body.text || body.prompt)) ||
      (req.query && (req.query.message || req.query.text)) ||
      "";

    if (!userMsg || !String(userMsg).trim()) {
      return res.status(400).json({
        error: "message_required",
        hint: "أرسل JSON مثل: { \"message\": \"مرحبا\" } مع Content-Type: application/json",
        receivedKeys: body ? Object.keys(body) : [],
      });
    }

    // 3) الموديل
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

    // 4) طلب Chat Completions (انتبه: هنا max_tokens)
    const out = await client.chat.completions.create({
      model,
      messages: [{ role: "user", content: String(userMsg) }],
      max_tokens: 300,
    });

    return res.status(200).json({ reply: out.choices[0].message.content });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
};
