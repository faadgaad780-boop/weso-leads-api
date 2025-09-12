// api/webhook.js
// Node 18+ on Vercel (fetch is built-in)

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;   // نفسه اللي كتبتَه في Meta Webhooks
const ACTION_TOKEN = process.env.ACTION_TOKEN;   // WhatsApp access token (permanent or system user)

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      // ============ VERIFICATION (Meta Webhooks) ============
      const mode = req.query["hub.mode"];
      const token = req.query["hub.verify_token"];
      const challenge = req.query["hub.challenge"];

      if (mode && token && mode === "subscribe" && token === VERIFY_TOKEN) {
        console.log("✅ Webhook verified.");
        return res.status(200).send(challenge);
      } else {
        console.warn("❌ Verification failed.", { mode, token });
        return res.status(403).end();
      }
    }

    if (req.method === "POST") {
      // ============ INCOMING WHATSAPP EVENT ============
      const body = req.body;
      if (!body || !body.object) {
        console.warn("⚠️ Invalid body:", body);
        return res.status(404).end();
      }

      // اطبع الحدث كامل للمتابعة في Logs
      console.log("📦 Webhook event:", JSON.stringify(body, null, 2));

      // غالباً object = "whatsapp_business_account"
      if (
        body.object === "whatsapp_business_account" &&
        Array.isArray(body.entry)
      ) {
        for (const entry of body.entry) {
          const changes = entry.changes || [];
          for (const change of changes) {
            const value = change.value || {};
            const phoneNumberId =
              value.metadata && value.metadata.phone_number_id;

            // لو في رسائل واردة
            if (Array.isArray(value.messages)) {
              for (const msg of value.messages) {
                const from = msg.from; // رقم المرسل (بصيغة دولية)
                const type = msg.type;

                // لو الرسالة نصية
                if (type === "text" && msg.text && msg.text.body) {
                  const textBody = msg.text.body;
                  console.log(`💬 رسالة من ${from}: ${textBody}`);

                  // رد تلقائي (اختياري) — علقها إذا ما تبغى ترد تلقائياً
                  try {
                    if (phoneNumberId && ACTION_TOKEN) {
                      await sendWhatsAppText({
                        phoneNumberId,
                        to: from,
                        text: "وصلت رسالتك ✅ — شكراً! (رد تلقائي)"
                      });
                      console.log(`✅ تم الرد على ${from}`);
                    } else {
                      console.warn(
                        "⚠️ لا يوجد ACTION_TOKEN أو phoneNumberId لإرسال رد."
                      );
                    }
                  } catch (e) {
                    console.error("❌ فشل الرد:", e);
                  }
                }

                // تقدر تضيف معالجات لأنواع أخرى (image, audio, interactive...إلخ)
              }
            }

            // حالات (قراءة/تسليم/فشل)
            if (Array.isArray(value.statuses)) {
              for (const st of value.statuses) {
                console.log("📮 Status update:", st.status, st);
              }
            }
          }
        }
      }

      // لازم نرجّع 200 بسرعة عشان Meta تعتبر الحدث مستلم
      return res.status(200).end();
    }

    // أي ميثود ثانية
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (err) {
    console.error("❌ Webhook handler error:", err);
    // حتى لو صار خطأ، رجّع 200 لتفادي إعادة المحاولة بشكل مزعج — أو 500 لو تبغى تعالج
    return res.status(200).end();
  }
}

/**
 * إرسال رسالة نصية عبر WhatsApp Cloud API
 * docs: https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages
 */
async function sendWhatsAppText({ phoneNumberId, to, text }) {
  const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body: text }
  };

  const r = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ACTION_TOKEN}`
    },
    body: JSON.stringify(payload)
  });

  const data = await r.json();
  if (!r.ok) {
    console.error("❌ WhatsApp send error:", r.status, data);
    throw new Error(`WhatsApp API error ${r.status}`);
  }
  return data;
}
