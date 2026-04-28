// ========================================
// API Proxy — Gemini (бесплатный tier)
// Vercel Serverless Function
// ========================================

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages, system, max_tokens } = req.body;

  // Конвертируем Anthropic формат → Gemini
  const geminiMessages = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: Array.isArray(m.content)
      ? m.content.map((c) => {
          if (c.type === 'text') return { text: c.text };
          if (c.type === 'image') {
            return { inlineData: { mimeType: c.source.media_type, data: c.source.data } };
          }
          return { text: '' };
        })
      : [{ text: m.content }]
  }));

  const body = {
    contents: geminiMessages,
    generationConfig: { maxOutputTokens: max_tokens || 1000 }
  };

  if (system) {
    body.systemInstruction = { parts: [{ text: system }] };
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        content: [{ type: 'text', text: 'GEMINI_API_KEY не настроен' }]
      });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }
    );

    const data = await response.json();

    if (data.error) {
      return res.status(400).json({
        content: [{ type: 'text', text: `Ошибка Gemini: ${data.error.message}` }]
      });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Ошибка генерации';
    return res.status(200).json({ content: [{ type: 'text', text }] });

  } catch (error) {
    return res.status(500).json({
      content: [{ type: 'text', text: `Ошибка сервера: ${error.message}` }]
    });
  }
}
