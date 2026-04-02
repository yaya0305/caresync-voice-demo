const http = require('http');
const https = require('https');

const ANTHROPIC_KEY = process.env.ANTHROPIC_KEY;
if (!ANTHROPIC_KEY) { console.error('❌ 請在 .env 設定 ANTHROPIC_KEY'); process.exit(1); }

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  if (req.method !== 'POST' || req.url !== '/translate') {
    res.writeHead(404); res.end(); return;
  }

  let body = '';
  req.on('data', d => body += d);
  req.on('end', () => {
    const { prompt } = JSON.parse(body);

    const payload = JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }]
    });

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
        try {
          const parsed = JSON.parse(data);
          const text = parsed.content?.[0]?.text || '翻譯失敗';
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ text }));
        } catch {
          res.writeHead(500); res.end('Parse error');
        }
      });
    });

    proxyReq.on('error', e => { res.writeHead(500); res.end(e.message); });
    proxyReq.write(payload);
    proxyReq.end();
  });
});

server.listen(3002, () => console.log('✅ Proxy running on http://localhost:3002'));
