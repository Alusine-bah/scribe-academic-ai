// Reads files IN THE BROWSER so only small text is sent to the server.
const MAX_PAGES = 80;

export async function extractText(file, onStatus) {
  const name = file.name.toLowerCase();

  if (file.type.startsWith('image/')) {
    onStatus('📷 Reading the photo (OCR)... this can take a moment');
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('eng');
    const { data } = await worker.recognize(file);
    await worker.terminate();
    return data.text;
  }

  if (name.endsWith('.pdf')) {
    onStatus('📄 Reading the PDF...');
    const pdfjs = await import('pdfjs-dist/build/pdf.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
    const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    let text = '';
    const pages = Math.min(pdf.numPages, MAX_PAGES);
    for (let i = 1; i <= pages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((it) => it.str).join(' ') + '\n';
    }
    return text;
  }

  if (name.endsWith('.docx')) {
    onStatus('📝 Reading the Word file...');
    const mammoth = (await import('mammoth/mammoth.browser')).default;
    const res = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return res.value;
  }

  return await file.text();
}
