export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      content: [{ type: 'text', text: 'Method not allowed' }]
    });
  }

  const { messages, system, max_tokens } = req.body;
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      content: [{ type: 'text', text: 'GROQ_API_KEY не настроен' }]
    });
  }

  const inputText = messages
    .map((m) => {
      if (Array.isArray(m.content)) {
        return m.content
          .filter((c) => c.type === 'text')
          .map((c) => c.text)
          .join('\n');
      }
      return m.content;
    })
    .join('\n\n');

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          ...(system ? [{ role: 'system', content: system }] : []),
          { role: 'user', content: inputText }
        ],
        max_tokens: max_tokens || 1000,
        temperature: 0.7
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(400).json({
        content: [{ type: 'text', text: `Ошибка Groq: ${data.error.message}` }]
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