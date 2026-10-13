import Papa from 'papaparse';

export function decodeBuffer(buf) {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(buf); }
  catch { return new TextDecoder('windows-1252').decode(buf); }
}

const DATE_RE = /^\s*\d{1,4}[\/\-.]\d{1,2}[\/\-.]\d{1,4}/;
const looksNum = (s) => /^[\s\-+(]*[\d.,]+\s*(eur|€)?\s*\)?-?\s*$/i.test(s || '');

/** Parseja el text, detecta el delimitador i la fila de capçalera (salta metadades). */
export function parseCsv(text) {
  text = text.replace(/^﻿/, '');
  let best = null;
  for (const delimiter of [',', ';', '\t']) {
    const res = Papa.parse(text, { delimiter, skipEmptyLines: true });
    const score = res.data.filter((r) => r.length >= 3).length;
    if (!best || score > best.score) best = { score, rows: res.data, delimiter };
  }
  const rows = best.rows;
  const isDateRow = (r) => r.some((c) => DATE_RE.test(c || ''));
  let headerIdx = -1, firstData = 0;
  for (let i = 0; i < Math.min(rows.length, 25); i++) {
    const r = rows[i];
    if (r.filter((c) => c && c.trim()).length < 3) continue;
    if (isDateRow(r)) { firstData = i; break; }
    if (rows[i + 1] && isDateRow(rows[i + 1])) { headerIdx = i; firstData = i + 1; break; }
  }
  const hasHeader = headerIdx >= 0;
  const width = Math.max(...rows.slice(firstData).map((r) => r.length), 0);
  const base = hasHeader ? rows[headerIdx] : [];
  const headers = Array.from({ length: width }, (_, i) => (base[i] || '').trim() || `Columna ${i + 1}`);
  const data = rows.slice(firstData).filter((r) => r.some((c) => c && c.trim()));
  const meta = rows.slice(0, hasHeader ? headerIdx : firstData).map((r) => r.join(' ')).join(' ');
  return { headers, rows: data, meta, delimiter: best.delimiter };
}

/** Intenta endevinar quina columna és quina. */
export function guessMapping(headers, rows) {
  const sample = rows.slice(0, 40);
  const col = (i) => sample.map((r) => r[i] || '');
  const by = (re) => headers.findIndex((h) => re.test(h));
  let date = by(/^(data|fecha|date)|data op|data val/i);
  if (date < 0) date = headers.findIndex((_, i) => col(i).filter((v) => DATE_RE.test(v)).length > sample.length * 0.6);
  let concept = by(/concept|descrip|detall|moviment|text/i);
  if (concept < 0) concept = headers.findIndex((_, i) => i !== date && col(i).some((v) => /[a-zà-ú]{3,}/i.test(v) && !looksNum(v)));
  let amount = by(/^(import|amount|quantitat|importe)/i);
  const debit = by(/d[eè]bit|c[aà]rrec|cargo|debe|despes|sortida/i);
  const credit = by(/cr[eè]dit|abonam|haber|ingr[eé]s|entrada/i);
  if (amount < 0 && debit < 0 && credit < 0)
    amount = headers.findIndex((h, i) => i !== date && !/saldo|balance/i.test(h) && col(i).filter(looksNum).length > sample.length * 0.6);
  return { date, concept, amount, debit: amount >= 0 ? -1 : debit, credit: amount >= 0 ? -1 : credit };
}

export function guessDateFormat(values) {
  const v = values.filter(Boolean).slice(0, 60);
  if (v.some((s) => /^\s*\d{4}[\/\-.]/.test(s))) return 'ymd';
  let dayFirst = false, monthFirst = false;
  for (const s of v) {
    const m = s.match(/^\s*(\d{1,2})[\/\-.](\d{1,2})/);
    if (!m) continue;
    if (+m[1] > 12) dayFirst = true;
    if (+m[2] > 12) monthFirst = true;
  }
  return monthFirst && !dayFirst ? 'mdy' : 'dmy';
}

export function parseDate(s, fmt) {
  const m = (s || '').match(/(\d{1,4})[\/\-.](\d{1,2})[\/\-.](\d{1,4})/);
  if (!m) return null;
  let y, mo, d;
  if (fmt === 'ymd') [y, mo, d] = [m[1], m[2], m[3]];
  else if (fmt === 'mdy') [mo, d, y] = [m[1], m[2], m[3]];
  else [d, mo, y] = [m[1], m[2], m[3]];
  y = +y; mo = +mo; d = +d;
  if (y < 100) y += 2000;
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 1990 || y > 2100) return null;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCMonth() !== mo - 1) return null;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function guessNumberFormat(values) {
  const v = values.filter(Boolean).slice(0, 60);
  let eu = 0, us = 0;
  for (const s of v) {
    const t = s.replace(/[^\d.,]/g, '');
    const lc = t.lastIndexOf(','), ld = t.lastIndexOf('.');
    if (lc >= 0 && ld >= 0) { lc > ld ? eu++ : us++; }
    else if (lc >= 0) { /,\d{1,2}$/.test(t) ? eu++ : us++; }
    else if (ld >= 0) { /\.\d{1,2}$/.test(t) ? us++ : eu++; }
  }
  return us > eu ? 'us' : 'eu';
}

export function parseAmount(s, fmt = 'eu') {
  if (s == null) return null;
  let t = String(s).trim();
  if (!t) return null;
  let neg = false;
  if (/^\(.*\)$/.test(t)) { neg = true; t = t.slice(1, -1); }
  if (/-\s*$/.test(t)) { neg = true; }
  if (/^\s*-/.test(t)) neg = true;
  t = t.replace(/[^\d.,]/g, '');
  if (!t) return null;
  if (fmt === 'eu') t = t.replace(/\./g, '').replace(',', '.');
  else t = t.replace(/,/g, '');
  const n = parseFloat(t);
  if (!isFinite(n)) return null;
  return Math.round((neg ? -n : n) * 100) / 100;
}
