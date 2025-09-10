// api/chat.js
const OpenAI = require("openai");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const { user_message, history = [], system, max_tokens = 350 } = req.body || {};

    if (!user_message) {
      res.status(400).json({ error: "user_message_required" });
      return;
    }

    // بنبني الرسائل (history اختيارية)
    const messages = [];
    messages.push({
      role: "system",
      content:
        system ||
        "أنت مساعد لمؤسسة Wesam Abdullah (تصميم وتسويق). ردودك مختصرة (3-5 جمل)، عملية، وتهدف لإغلاق الصفقة بسرعة."
    });
    // تاريخ سابق إن وجد
    if (Array.isArray(history)) {
      for (const m of history) {
        if (m?.role && m?.content) messages.push({ role: m.role, content: m.content });
      }
    }
    // رسالة المستخدم الحالية
    messages.push({ role: "user", content: user_message });

    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-5-mini",
      temperature: 0.7,
      max_tokens: Math.min(Number(max_tokens) || 350, 600),
      messages
    });

    const msg = completion.choices?.[0]?.message || { role: "assistant", content: "" };
    res.status(200).json({ ok: true, message: msg });
  } catch (err) {
    console.error("chat_error", err?.response?.data || err);
    if (err?.status === 429) {
      res.status(429).json({ error: "rate_limited" });
      return;
    }
    if (err?.status === 401) {
      res.status(401).json({ error: "invalid_api_key" });
      return;
    }
    res.status(500).json({ error: "server_error" });
  }
};
