// api/chat.js
module.exports = async (req, res) => {
  // فحص الطرق المدعومة
  if (req.method === "GET") {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.status(200).json({ ok: true, route: "/api/chat", method: "GET" });
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  try {
    // استيراد مكتبة OpenAI بصيغة متوافقة مع CommonJS
    const { default: OpenAI } = await import("openai");

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "missing_openai_api_key" });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // بعض المنصات قد ترسل body كسلسلة نصية
    const safeBody =
      typeof req.body === "string" ? (JSON.parse(req.body || "{}") || {}) : (req.body || {});

    const {
      user_message,
      history = [],
      system,
      max_tokens = 350,
      temperature = 0.7,
      model: modelFromBody
    } = safeBody;

    if (!user_message) {
      return res.status(400).json({ error: "user_message_required" });
    }

    const model = modelFromBody || process.env.OPENAI_MODEL || "gpt-5-mini";

    // تجهيز الرسائل كنص واحد لـ Responses API
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

    const input = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n");

    // استخدام Responses API + max_completion_tokens (وليس max_tokens)
    const response = await client.responses.create({
      model,
      input,
      max_completion_tokens: Math.min(Number(max_tokens) || 350, 600),
      temperature: Number.isFinite(temperature) ? temperature : 0.7
    });

    // استخراج النص بأكثر من احتمال
    const text =
      response.output_text ||
      response?.content?.[0]?.text ||
      (Array.isArray(response?.output)
        ? (response.output[0]?.content?.[0]?.text?.value || "")
        : "") ||
      "";

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.status(200).json({
      ok: true,
      message: { role: "assistant", content: text }
    });

  } catch (err) {
    console.error("chat_error", err?.response?.data || err);
    const status = err?.status || err?.response?.status;
    if (status === 429) return res.status(429).json({ error: "rate_limited" });
    if (status === 401) return res.status(401).json({ error: "invalid_api_key" });
    return res.status(500).json({ error: "server_error" });
  }
};
