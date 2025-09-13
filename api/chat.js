// api/chat.js
module.exports = async (req, res) => {
  // السماح لاختبار GET
  if (req.method === "GET") {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res
      .status(200)
      .json({ ok: true, route: "/api/chat", method: "GET" });
  }

  // السماح فقط لـ POST
  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  try {
    // استيراد مكتبة OpenAI
    const OpenAI = (await import("openai")).default;

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "missing_openai_api_key" });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // التعامل مع الـ body
    const safeBody =
      typeof req.body === "string"
        ? (JSON.parse(req.body || "{}") || {})
        : (req.body || {});

    const {
      user_message,
      history = [],
      system,
      max_tokens = 350,
      temperature = 0.7,
      model: modelFromBody,
    } = safeBody;

    if (!user_message) {
      return res.status(400).json({ error: "user_message_required" });
    }

    // اختيار الموديل (Body -> Env -> Default)
    const model =
      modelFromBody || process.env.OPENAI_MODEL || "gpt-4o-mini";

    // تحضير الرسائل
    const messages = [
      {
        role: "system",
        content:
          system ||
          "أنت مساعد لمؤسسة Wesam Abdullah (تصميم وتسويق). اجعل الردود مختصرة (3-5 جمل)، عملية، وتدفع العميل لاتخاذ خطوة.",
      },
      ...(Array.isArray(history)
        ? history.filter((m) => m?.role && m?.content)
        : []),
      { role: "user", content: user_message },
    ];

    // الاتصال بالـ API
    const completion = await client.chat.completions.create({
      model,
      messages,
      max_tokens: Math.min(Number(max_tokens) || 350, 1200),
      temperature: Number.isFinite(temperature) ? temperature : 0.7,
    });

    const text =
      completion?.choices?.[0]?.message?.content?.trim() || "";

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.status(200).json({
      ok: true,
      model,
      message: { role: "assistant", content: text },
    });
  } catch (err) {
    console.error("chat_error", err?.response?.data || err);
    const status = err?.status || err?.response?.status;
    if (status === 429)
      return res.status(429).json({ error: "rate_limited" });
    if (status === 401)
      return res.status(401).json({ error: "invalid_api_key" });
    return res.status(500).json({ error: "server_error" });
  }
};
