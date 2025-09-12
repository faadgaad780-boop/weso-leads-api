export default function handler(req, res) {
  if (req.method === "GET") {
    const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode && token) {
      if (mode === "subscribe" && token === VERIFY_TOKEN) {
        console.log("WEBHOOK_VERIFIED");
        res.status(200).send(challenge);   // 👈 يرد على فيسبوك للتحقق
      } else {
        res.status(403).end();             // 👈 بدل sendStatus(403)
      }
    }
  } else if (req.method === "POST") {
    console.log("Webhook event:", JSON.stringify(req.body, null, 2));
    res.status(200).end();                 // 👈 بدل sendStatus(200)
  } else {
    res.status(405).end();                 // 👈 Method Not Allowed
  }
}
