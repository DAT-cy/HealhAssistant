const http = require('http');
const PORT = process.env.PORT || 4910;

const server = http.createServer((req, res) => {
  const pathname = new URL(req.url || '', 'http://localhost').pathname;
  if (req.method === 'POST' && /^\/v1beta\/models\/([^/]+):generateContent$/.test(pathname)) {
    const chunks = [];
    req.on('data', (chunk) => { chunks.push(Buffer.from(chunk)); });
    req.on('end', () => {
      try {
        const request = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if (!Array.isArray(request.contents) || request.contents.length === 0) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: { message: 'contents is required' } }));
        }
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: { message: 'invalid JSON body' } }));
      }
      const responseSchema = request.generationConfig?.responseSchema?.properties || {};
      const promptText = request.contents.flatMap((content) => content.parts || []).map((part) => part.text || '').join('\n');
      const timeMatch = /Thời gian sẵn có:\s*(\d+)\s*phút/i.exec(promptText);
      const sessionMinutes = Math.max(10, Math.min(25, Number(timeMatch?.[1] || 25)));
      const activities = sessionMinutes < 20
        ? ['Khởi động nhẹ trong 3 phút', `Vận động vừa sức trong ${sessionMinutes - 6} phút`, 'Thả lỏng trong 3 phút']
        : ['Khởi động toàn thân trong 5 phút', `Thực hiện bài tập sức mạnh nhẹ trong ${sessionMinutes - 8} phút`, 'Thả lỏng trong 3 phút'];
      const text = responseSchema.title && responseSchema.activities
        ? JSON.stringify({
            title: 'Buổi tập toàn thân nhẹ',
            duration: `${sessionMinutes} phút`,
            activities,
            safetyNotes: ['Tập trong ngưỡng thoải mái; dừng lại nếu đau hoặc khó chịu.'],
          })
        : JSON.stringify({ message: 'Mock Gemini response for local end-to-end validation.', safetyEscalation: false });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ candidates: [{ content: { parts: [{ text }] }, finishReason: 'STOP' }] }));
    });
    return;
  }
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint not defined' }));
});

server.listen(PORT);
