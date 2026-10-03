import pdf from 'pdf-parse/lib/pdf-parse.js';
import mammoth from 'mammoth';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_CHARS = 24000;

async function extract(file) {
  const buf = Buffer.from(await file.arrayBuffer());
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf')) return (await pdf(buf)).text;
  if (name.endsWith('.docx')) return (await mammoth.extractRawText({ buffer: buf })).value;
  return buf.toString('utf-8');
}

export async function POST(req) {
  try {
    if (!process.env.GROQ_API_KEY) return Response.json({ error: 'Server is missing GROQ_API_KEY' }, { status: 500 });
    const form = await req.formData();
    const persona = form.get('persona') || 'School Administrator';
    const file = form.get('file');
    let text = form.get('text') || '';
    if (file && typeof file !== 'string') text = await extract(file);
    text = text.trim().slice(0, MAX_CHARS);
    if (text.length < 30) return Response.json({ error: 'Could not read enough text from this file.' }, { status: 400 });

    const system = `You are an expert West African academic consultant and systems engineer. The reader is a ${persona}.
Analyse the institutional document and reply ONLY with JSON in this exact shape:
{"summary":"3 sentences max","checklist":[{"task":"...","deadline":"date or empty string"}],"departments":[{"name":"department or role","actions":["..."]}],"whatsapp":"short emoji-bulleted summary for a staff WhatsApp group"}
Checklist must be in chronological order. Use plain simple English. Do not invent facts that are not in the document.`;

    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: system }, { role: 'user', content: text }],
      }),
    });
    if (!r.ok) return Response.json({ error: 'AI service error: ' + (await r.text()).slice(0, 200) }, { status: 502 });
    const j = await r.json();
    return Response.json(JSON.parse(j.choices[0].message.content));
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
