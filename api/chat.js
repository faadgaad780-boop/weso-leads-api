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

    const messages = [
      {
        role: "system",
        content:
          system ||
          "أنت مساعد لمؤسسة Wesam Abdullah (تصميم وتسويق). ردودك مختصرة (3-5 جمل)، عملية، وتهدف لإغلاق الصفقة بسرعة."
      },
      ...(Array.isArray(history) ? history.filter(m => m?.role && m?.content) : []),
      { role: "user", content: user_message }
    ];

    const params = {
  model: process.env.OPENAI_MODEL || "gpt-5-mini",
  temperature: 0.7,
  messages
};
params.max_completion_tokens = Math.min(Number(max_tokens) || 350, 600);

const completion = await client.chat.completions.create(params);

    res.status(200).json({
      ok: true,
      message: completion.choices?.[0]?.message || { role: "assistant", content: "" }
    });
  } catch (err) {
    console.error("chat_error", err?.response?.data || err);
    if (err?.status === 429) return res.status(429).json({ error: "rate_limited" });
    if (err?.status === 401) return res.status(401).json({ error: "invalid_api_key" });
    res.status(500).json({ error: "server_error" });
  }
};
use max_completion_tokens instead of max_tokens
