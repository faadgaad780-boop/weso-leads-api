// api/env-check.js
module.exports = async (req, res) => {
  return res.status(200).json({
    ok: true,
    hasOpenAIKey: Boolean(process.env.OPENAI_API_KEY),
    modelSet: Boolean(process.env.OPENAI_MODEL),
  });
};
