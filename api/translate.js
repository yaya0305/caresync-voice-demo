const https = require('https');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).end(); return; }

  const { prompt } = req.body;
  const ANTHROPIC_KEY = process.env.ANTHROPIC_KEY;

  const payload = JSON.stringify({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [{ role: 'user', content: prompt }]
  });

  return new Promise((resolve) => {
    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const proxyReq = https.request(options, proxyRes => {
      let data = '';
      proxyRes.on('data', d => data += d);
      proxyRes.on('end', () => {
        const parsed = JSON.parse(data);
        const text = parsed.content?.[0]?.text || '翻譯失敗';
        res.status(200).json({ text });
        resolve();
      });
    });

    proxyReq.on('error', e => { res.status(500).json({ error: e.message }); resolve(); });
    proxyReq.write(payload);
    proxyReq.end();
  });
}
