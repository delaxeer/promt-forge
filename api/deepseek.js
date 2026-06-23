export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages = [], system, max_tokens } = req.body || {};

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      content: [{ type: 'text', text: 'DEEPSEEK_API_KEY не настроен в Vercel Environment Variables' }]
    });
  }

  function normalizeContent(content) {
    if (Array.isArray(content)) {
      return content
        .map((part) => {
          if (part?.type === 'text') return part.text || '';
          if (part?.type === 'image') {
            return '[User attached an image, but this DeepSeek proxy cannot read image pixels. Use only the written task and do not invent unseen image details.]';
          }
          return '';
        })
        .filter(Boolean)
        .join('\n\n');
    }

    return String(content || '');
  }

  const deepseekMessages = [];

  deepseekMessages.push({
    role: 'system',
    content: 'Возьми этот промт ТОЛЬКО как шаблон и сделай под мою задачу:'
  });

  if (system) {
    deepseekMessages.push({
      role: 'system',
      content: String(system)
    });
  }

  for (const m of messages) {
    deepseekMessages.push({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: normalizeContent(m.content)
    });
  }

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
        messages: deepseekMessages,
        max_tokens: max_tokens || 1000,
        stream: false,
        thinking: { type: 'disabled' }
      })
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      return res.status(response.status || 400).json({
        content: [{
          type: 'text',
          text: `Ошибка DeepSeek: ${data.error?.message || JSON.stringify(data)}`
        }]
      });
    }

    const text = data.choices?.[0]?.message?.content || 'Ошибка генерации';

    return res.status(200).json({
      content: [{ type: 'text', text }]
    });

  } catch (error) {
    return res.status(500).json({
      content: [{ type: 'text', text: `Ошибка сервера: ${error.message}` }]
    });
  }
}
