'use client';
import { useState } from 'react';
import { extractText } from './extract';

const PERSONAS = ['Secondary School Principal', 'University Dean', 'Curriculum Reviewer', 'Classroom Teacher', 'School Administrator / Registrar'];
const TABS = ['✅ Action Checklist', '🏫 Staff Planner', '📱 WhatsApp Summary'];

export default function Home() {
  const [persona, setPersona] = useState(PERSONAS[0]);
  const [status, setStatus] = useState('');
  const [data, setData] = useState(null);
  const [tab, setTab] = useState(0);
  const [done, setDone] = useState({});
  const [drag, setDrag] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handle(file) {
    if (!file) return;
    setData(null); setDone({}); setTab(0);
    try {
      if (file.size > 25 * 1024 * 1024) throw new Error('File is too big (max 25 MB).');
      const text = await extractText(file, setStatus);
      if (!text || text.trim().length < 30)
        throw new Error('No readable text found. If this is a scanned PDF, take a photo of the page and upload the photo instead.');
      setStatus('🤖 AI is analysing the document...');
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, persona }),
      });
      const raw = await res.text();
      let json;
      try { json = JSON.parse(raw); } catch { throw new Error('Server problem (' + res.status + '). Please try a shorter document.'); }
      if (!res.ok) throw new Error(json.error || 'Something went wrong');
      setData(json); setStatus('');
    } catch (e) { setStatus('❌ ' + e.message); }
  }

  async function copy() {
    await navigator.clipboard.writeText(data.whatsapp);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  }

  return (
    <main>
      <h1>📚 ScribeAcademic AI</h1>
      <p className="sub">Drop a PDF, Word file, or a photo of a printed letter. Get a clear action plan.</p>

      <select value={persona} onChange={(e) => setPersona(e.target.value)}>
        {PERSONAS.map((p) => <option key={p}>{p}</option>)}
      </select>

      <div className={'drop' + (drag ? ' on' : '')}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files[0]); }}
        onClick={() => document.getElementById('f').click()}>
        Drag & drop here, or tap to choose a file
        <input id="f" type="file" hidden accept=".pdf,.docx,.txt,image/*" onChange={(e) => handle(e.target.files[0])} />
      </div>

      {status && <div className="status">{status}</div>}

      {data && (<>
        <div className="card"><b>Summary</b><p>{data.summary}</p></div>
        <div className="tabs">
          {TABS.map((t, i) => <button key={t} className={tab === i ? 'act' : ''} onClick={() => setTab(i)}>{t}</button>)}
        </div>

        {tab === 0 && <div className="card">
          {data.checklist?.map((c, i) => (
            <label key={i}>
              <input type="checkbox" checked={!!done[i]} onChange={() => setDone({ ...done, [i]: !done[i] })} />
              <span className={done[i] ? 'strike' : ''}>{c.task} {c.deadline && <span className="d">· {c.deadline}</span>}</span>
            </label>
          ))}
        </div>}

        {tab === 1 && data.departments?.map((d, i) => (
          <div className="card" key={i}><b>{d.name}</b>
            <ul>{d.actions?.map((a, j) => <li key={j}>{a}</li>)}</ul>
          </div>
        ))}

        {tab === 2 && <div className="card">
          <textarea readOnly value={data.whatsapp} />
          <button className="copy" onClick={copy}>{copied ? 'Copied!' : 'Copy for WhatsApp'}</button>
        </div>}
      </>)}
    </main>
  );
}
