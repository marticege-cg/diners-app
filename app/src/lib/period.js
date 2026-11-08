import { shiftMonth, todayISO } from './utils';

const dayDiff = (a, b) => Math.round((new Date(a + 'T00:00:00Z') - new Date(b + 'T00:00:00Z')) / 86400000);
const shortDate = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString('ca-ES', { day: 'numeric', month: 'short' });

/**
 * Mes comptable "des de la nòmina".
 * Cada nòmina (categoria SALARI, import positiu) obre un mes nou:
 *  - si arriba el dia `cutoff` o més (p. ex. 31 d'octubre) → compta pel mes SEGÜENT (novembre);
 *  - si arriba els primers 5 dies del mes (p. ex. 1 d'octubre) → compta per aquell mes;
 *  - les nòmines de mig mes (extres, pagues) no obren mes: sumen com a ingrés del mes en curs.
 * Cada moviment pertany al mes de l'última nòmina que l'ha precedit.
 * Sense nòmines (o desactivat) es fa servir el mes natural de sempre.
 */
export function makePeriods(txs, catById, { enabled = true, cutoff = 25 } = {}) {
  const anchors = [];
  if (enabled) {
    const seen = new Set();
    for (const t of txs) {
      if (!(t.amount > 0) || catById.get(t.category_id)?.code !== 'SALARI') continue;
      const day = Number(t.tx_date.slice(8, 10));
      const m = t.tx_date.slice(0, 7);
      const label = day >= cutoff ? shiftMonth(m, 1) : day <= 5 ? m : null;
      if (!label || seen.has(t.tx_date)) continue;
      seen.add(t.tx_date);
      anchors.push({ date: t.tx_date, label });
    }
    anchors.sort((a, b) => (a.date < b.date ? -1 : 1));
  }

  const of = (iso) => {
    let lo = 0, hi = anchors.length - 1, idx = -1;
    while (lo <= hi) { const mid = (lo + hi) >> 1; if (anchors[mid].date <= iso) { idx = mid; lo = mid + 1; } else hi = mid - 1; }
    // abans de la primera nòmina, o si fa massa que no n'hi ha cap (extracte no importat): mes natural
    if (idx < 0 || dayDiff(iso, anchors[idx].date) > 45) return iso.slice(0, 7);
    return anchors[idx].label;
  };

  const tag = (list) => list.map((t) => ({ ...t, _m: of(t.tx_date) }));
  const current = of(todayISO());

  /** Rang de dates d'un mes, per mostrar-lo sota el selector. */
  const range = (label) => {
    if (!anchors.length) return null;
    const first = anchors.find((a) => a.label === label);
    if (!first) return null;
    const next = anchors.find((a) => a.label === shiftMonth(label, 1));
    const to = next ? new Date(new Date(next.date + 'T00:00:00Z').getTime() - 86400000).toISOString().slice(0, 10) : null;
    return `${shortDate(first.date)} – ${to ? shortDate(to) : 'avui'}`;
  };

  return { of, tag, current, range, enabled: anchors.length > 0 };
}
