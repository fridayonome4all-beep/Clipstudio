import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const app = express();
const PORT = 3000;

// Generous payload limits for audio transcription
app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));

// In-memory temporary video storage for streaming download fallback
const tempDownloads = new Map<string, { buffer: Buffer; name: string; mime: string; created: number }>();
setInterval(() => {
  const now = Date.now();
  for (const [id, item] of tempDownloads.entries()) {
    if (now - item.created > 20 * 60 * 1000) {
      tempDownloads.delete(id);
    }
  }
}, 60000);

// Temporary video upload endpoint for mobile HTTP download fallback
app.post('/api/prepare-download', express.raw({ type: 'video/*', limit: '2000mb' }), (req, res) => {
  try {
    const filename = (req.query.name as string) || 'video.mp4';
    const id = 'dl_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    tempDownloads.set(id, {
      buffer: req.body as Buffer,
      name: filename,
      mime: 'video/mp4',
      created: Date.now()
    });
    res.json({ ok: true, id, url: `/api/download/${id}/${encodeURIComponent(filename)}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to prepare download' });
  }
});

app.get('/api/download/:id/:name', (req, res) => {
  const item = tempDownloads.get(req.params.id);
  if (!item) {
    return res.status(404).send('Download expired or not found. Please export again.');
  }
  res.setHeader('Content-Type', item.mime);
  res.setHeader('Content-Disposition', `attachment; filename="${item.name}"`);
  res.setHeader('Content-Length', item.buffer.length);
  res.send(item.buffer);
});

// Auto-transcribe audio using Gemini API
app.post('/api/transcribe', async (req, res) => {
  try {
    const { audioBase64, mimeType } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ error: 'Missing audio data' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on server' });
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `You are an expert audio subtitle transcriber. Transcribe the spoken speech in this audio file.
Split the spoken words into concise, natural subtitle sentences or phrases suitable for video captions (3 to 8 words per segment).
For each subtitle segment, provide:
- "start": exact start time in seconds (float, e.g. 1.25)
- "end": exact end time in seconds (float, e.g. 4.10)
- "text": the transcribed spoken text

Return ONLY a clean JSON array with no markdown code fences, matching this structure:
[
  {"start": 0.0, "end": 2.5, "text": "First-class expectations create great pressure."},
  {"start": 2.8, "end": 6.2, "text": "Sitting alone, wondering where things went wrong."}
]`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          inlineData: {
            mimeType: mimeType || 'audio/wav',
            data: audioBase64
          }
        },
        prompt
      ],
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text || '[]';
    let segments: any[] = [];
    try {
      segments = JSON.parse(text);
    } catch {
      const match = text.match(/\[[\s\S]*\]/);
      if (match) segments = JSON.parse(match[0]);
    }

    res.json({ ok: true, subtitles: segments });
  } catch (err: any) {
    console.error('Transcription error:', err);
    res.status(500).json({ error: err.message || 'Audio transcription failed' });
  }
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true }
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve('dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve('dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Clip Studio full-stack server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
