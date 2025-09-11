// api/chat.js
const OpenAI = require("openai");

module.exports = async (req, res) => {
  // فحص سريع
  if (req.method === "GET") {
    return res.status(200).json({ ok: true, route: "/api/chat", method: "GET" });
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const {
      user_message,
      history = [],
      system,
      max_tokens = 350,
    } = req.body || {};

    if (!user_message) {
      return res.status(400).json({ error: "user_message_required" });
    }

    // الرسائل
    const messages = [
      {
        role: "system",
        content:
          system ||
          "أنت مساعد لمؤسسة Wesam Abdullah (تصميم وتسويق). ردودك مختصرة (3-5 جمل)، عملية، وتهدف لإغلاق الصفقة بسرعة.",
      },
      ...(Array.isArray(history) ? history.filter(m => m?.role && m?.content) : []),
      { role: "user", content: user_message },
    ];

    // Responses API تقبل input (نحوّل الرسائل إلى نص واحد مرتب)
    const input = messages
      .map(m => `${m.role.toUpperCase()}: ${m.content}`)
      .join("\n");

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5-mini",
      input,
      // المهمة: استخدام max_completion_tokens بدل max_tokens
      max_completion_tokens: Math.min(Number(max_tokens) || 350, 600),
      temperature: 0.7,
    });

    // استخراج النص (هذي خاصية مريحة في SDK الحديث)
    const text =
      response.output_text ||
      response?.content?.[0]?.text ||
      "";

    return res.status(200).json({
      ok: true,
      message: { role: "assistant", content: text },
    });
  } catch (err) {
    console.error("chat_error", err?.response?.data || err);
    if (err?.status === 429) return res.status(429).json({ error: "rate_limited" });
    if (err?.status === 401) return res.status(401).json({ error: "invalid_api_key" });
    return res.status(500).json({ error: "server_error" });
  }
};
