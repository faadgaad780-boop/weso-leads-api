// api/chat.js
module.exports = (req, res) => {
  res.status(200).json({ ok: true, route: "/api/chat", method: req.method });
};
