import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...a) => twMerge(clsx(a));

const nf = new Intl.NumberFormat('ca-ES', { style: 'currency', currency: 'EUR' });
const nf0 = new Intl.NumberFormat('ca-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
export const eur = (n) => nf.format(Math.round((n || 0) * 100) / 100);
export const eur0 = (n) => nf0.format(n || 0);
export const signed = (n) => (n > 0 ? '+' : '') + eur(n);
export const round2 = (n) => Math.round(n * 100) / 100;

export const MONTHS = ['Gener', 'Febrer', 'Març', 'Abril', 'Maig', 'Juny', 'Juliol', 'Agost', 'Setembre', 'Octubre', 'Novembre', 'Desembre'];
export const MONTHS_SHORT = ['gen', 'feb', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'des'];

export const pad = (n) => String(n).padStart(2, '0');
export const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
export const monthOf = (iso) => iso.slice(0, 7);
export const monthLabel = (key) => { const [y, m] = key.split('-').map(Number); return `${MONTHS[m - 1]} ${y}`; };
export const monthShort = (key) => MONTHS_SHORT[Number(key.slice(5, 7)) - 1];
export const shiftMonth = (key, delta) => { const [y, m] = key.split('-').map(Number); const d = new Date(y, m - 1 + delta, 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
export const daysInMonth = (key) => { const [y, m] = key.split('-').map(Number); return new Date(y, m, 0).getDate(); };
export const fmtDate = (iso) => { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y.slice(2)}`; };

// Colors de categoria (mateix color als badges i als gràfics)
export const CAT_COLORS = {
  ALIM: '#22c55e', MOBILITAT: '#38bdf8', SUBS: '#a78bfa', OCI: '#f59e0b', COMPRES: '#f472b6',
  VIATGES: '#2dd4bf', TABAC: '#a8a29e', SALUT: '#fb7185', JOC: '#ef4444', LLAR: '#60a5fa', ALTRES: '#94a3b8',
  SALARI: '#34d399', ING_ALTRES: '#4ade80', BIZUM: '#c084fc', EFECTIU: '#fbbf24', INVERSIO: '#818cf8', TRANSFER: '#71717a',
};
export const catColor = (code) => CAT_COLORS[code] || '#94a3b8';
