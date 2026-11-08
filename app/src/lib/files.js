// Converteix xlsx / xls / ods / pdf en text CSV perquè entri pel mateix flux d'importació que els .csv.

const q = (c) => `"${String(c ?? '').replace(/"/g, '""')}"`;

export const ACCEPT = '.csv,.txt,.xlsx,.xls,.ods,.pdf,text/csv,text/plain,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
export const extOf = (name) => (name.match(/\.([a-z0-9]+)$/i)?.[1] || '').toLowerCase();
export const isSupported = (file) => ['csv', 'txt', 'xlsx', 'xls', 'ods', 'pdf'].includes(extOf(file.name)) || /csv|text|pdf|spreadsheet|excel/.test(file.type);

async function sheetToCsv(buffer) {
  const XLSX = await import('xlsx');
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
  // la fulla amb més files de dades
  let best = null;
  for (const n of wb.SheetNames) {
    const ws = wb.Sheets[n];
    const csv = XLSX.utils.sheet_to_csv(ws, { FS: ';', blankrows: false, dateNF: 'dd/mm/yyyy', rawNumbers: false });
    const lines = csv.split('\n').filter((l) => l.replace(/;/g, '').trim()).length;
    if (!best || lines > best.lines) best = { csv, lines };
  }
  if (!best || best.lines < 2) throw new Error('El full de càlcul està buit.');
  return best.csv;
}

async function pdfToCsv(buffer) {
  const pdfjs = await import('pdfjs-dist/build/pdf.mjs');
  const worker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = worker;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
  const out = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const { items } = await page.getTextContent();
    // agrupa per línia (coordenada Y) i separa en cel·les pels buits horitzontals
    const lines = [];
    for (const it of items) {
      if (!it.str || !it.str.trim()) continue;
      const y = it.transform[5], x = it.transform[4];
      let line = lines.find((l) => Math.abs(l.y - y) < 2.5);
      if (!line) { line = { y, parts: [] }; lines.push(line); }
      line.parts.push({ x, w: it.width, s: it.str });
    }
    lines.sort((a, b) => b.y - a.y);
    for (const l of lines) {
      l.parts.sort((a, b) => a.x - b.x);
      const cells = [];
      let last = null;
      for (const pt of l.parts) {
        if (last && pt.x - last.end < 6) cells[cells.length - 1] += (pt.x - last.end > 1.2 ? ' ' : '') + pt.s;
        else cells.push(pt.s);
        last = { end: pt.x + pt.w };
      }
      out.push(cells.map((c) => c.trim()).filter(Boolean));
    }
  }
  const text = out.filter((r) => r.length);
  if (text.length < 2) throw new Error('El PDF no té text seleccionable (potser és una imatge escanejada).');
  return text.map((r) => r.map(q).join(';')).join('\n');
}

/** Retorna un ArrayBuffer amb el contingut en CSV (UTF-8). */
export async function fileToCsvBuffer(file) {
  const ext = extOf(file.name);
  const buf = await file.arrayBuffer();
  if (ext === 'pdf' || file.type === 'application/pdf') return new TextEncoder().encode(await pdfToCsv(buf)).buffer;
  if (['xlsx', 'xls', 'ods'].includes(ext)) return new TextEncoder().encode(await sheetToCsv(buf)).buffer;
  return buf;
}
