import { jsPDF } from 'jspdf';

// The built-in PDF font has no emoji, so keep plain text only.
const clean = (t = '') =>
  String(t)
    .replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/…/g, '...')
    .replace(/[^\x20-\x7E\u00A0-\u00FF\n]/g, '').trim();

export function downloadPdf(data, persona) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const margin = 48;
  const maxW = W - margin * 2;
  let y = margin;

  const write = (text, { size = 11, bold = false, indent = 0, gap = 6, box = false } = {}) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(clean(text), maxW - indent);
    lines.forEach((line, i) => {
      if (y + size + 4 > H - margin) { doc.addPage(); y = margin; }
      if (box && i === 0) doc.rect(margin, y + 1, 9, 9);
      doc.text(line, margin + indent, y + size);
      y += size + 4;
    });
    y += gap;
  };

  write('ScribeAcademic AI - Action Plan', { size: 18, bold: true, gap: 2 });
  write('Prepared for: ' + persona + '  |  ' + new Date().toLocaleDateString(), { size: 9, gap: 14 });

  write('Summary', { size: 13, bold: true });
  write(data.summary, { gap: 14 });

  write('Action Checklist', { size: 13, bold: true });
  (data.checklist || []).forEach((c) =>
    write(c.task + (c.deadline ? '  (' + c.deadline + ')' : ''), { indent: 18, box: true, gap: 3 }));
  y += 10;

  write('Staff Planner', { size: 13, bold: true });
  (data.departments || []).forEach((d) => {
    write(d.name, { bold: true, gap: 2 });
    (d.actions || []).forEach((a) => write('- ' + a, { indent: 10, gap: 2 }));
    y += 6;
  });

  write('AI-generated. Always check deadlines against the original document.', { size: 8, gap: 0 });
  doc.save('action-plan.pdf');
}
