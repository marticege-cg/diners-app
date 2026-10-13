import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from './supabase';
import { round2 } from './utils';

const TX_COLS = 'id,tx_date,concept,amount,category_id,account_id,source,status,created_at';
let tmpSeq = 0;
const newTmp = () => `tmp-${Date.now()}-${++tmpSeq}`;
const isTmp = (id) => typeof id === 'string' && id.startsWith('tmp-');
const clean = (t) => { const { _sync, _prev, _pending, ...r } = t; return r; };

async function fetchAllTx() {
  const out = [];
  const size = 1000;
  for (let from = 0; ; from += size) {
    const { data, error } = await supabase.from('transactions').select(TX_COLS)
      .order('tx_date', { ascending: false }).order('id', { ascending: true }).range(from, from + size - 1);
    if (error) throw error;
    out.push(...data.map((r) => ({ ...r, amount: Number(r.amount) })));
    if (data.length < size) break;
  }
  return out;
}

export function useStore(enabled) {
  const [state, setState] = useState({ cats: [], accounts: [], txs: [], settings: {}, insights: [], loading: true, error: null, loadedAt: null });
  const txsRef = useRef([]);
  txsRef.current = state.txs;

  const setTxs = useCallback((fn) => setState((s) => ({ ...s, txs: typeof fn === 'function' ? fn(s.txs) : fn })), []);
  const patchRow = useCallback((id, fn) => setTxs((ts) => ts.map((t) => (t.id === id ? fn(t) : t))), [setTxs]);

  const load = useCallback(async (quiet) => {
    if (!quiet) setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const [c, a, st, ins, txs] = await Promise.all([
        supabase.from('categories').select('id,code,name,emoji,kind,monthly_budget,sort').order('sort'),
        supabase.from('accounts').select('id,name,kind,opening_balance').order('id'),
        supabase.from('settings').select('key,value'),
        supabase.from('insights').select('id,kind,title,body,created_at,dismissed').eq('dismissed', false).order('created_at', { ascending: false }).limit(20),
        fetchAllTx(),
      ]);
      for (const r of [c, a, st, ins]) if (r.error) throw r.error;
      const settings = Object.fromEntries((st.data || []).map((r) => [r.key, r.value]));
      setState((s) => {
        // Conserva les files locals que encara no s'han pogut sincronitzar
        const local = s.txs.filter((t) => t._sync === 'error' || (isTmp(t.id) && t._sync));
        return { ...s, cats: c.data, accounts: a.data.map((x) => ({ ...x, opening_balance: Number(x.opening_balance) })), settings, insights: ins.data, txs: [...local, ...txs], loading: false, error: null, loadedAt: Date.now() };
      });
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: e.message || String(e) }));
    }
  }, []);

  useEffect(() => { if (enabled) load(); }, [enabled, load]);
  useEffect(() => {
    if (!enabled) return;
    const onVis = () => { if (document.visibilityState === 'visible') load(true); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [enabled, load]);

  // ---------- operacions amb estat de sincronització ----------
  const runInsert = useCallback(async (tmpId, payload) => {
    patchRow(tmpId, (t) => ({ ...t, _sync: 'saving' }));
    const { data, error } = await supabase.from('transactions').insert(payload).select(TX_COLS).single();
    if (error) {
      patchRow(tmpId, (t) => ({ ...t, _sync: 'error', _pending: { type: 'insert', payload } }));
      return false;
    }
    setTxs((ts) => ts.map((t) => (t.id === tmpId ? { ...data, amount: Number(data.amount) } : t)));
    return true;
  }, [patchRow, setTxs]);

  const addTx = useCallback(async (row) => {
    const payload = { source: 'manual', status: 'saved', ...row, amount: round2(row.amount) };
    const tmp = newTmp();
    setTxs((ts) => [{ id: tmp, created_at: new Date().toISOString(), ...payload, _sync: 'saving' }, ...ts]);
    return runInsert(tmp, payload);
  }, [runInsert, setTxs]);

  const runUpdate = useCallback(async (id, patch) => {
    const { error } = await supabase.from('transactions').update(patch).eq('id', id);
    if (error) {
      patchRow(id, (t) => ({ ...t, _sync: 'error', _pending: { type: 'update', patch: { ...(t._pending?.patch || {}), ...patch } } }));
      return false;
    }
    patchRow(id, (t) => { const { _sync, _prev, _pending, ...r } = t; return r; });
    return true;
  }, [patchRow]);

  const updateTx = useCallback(async (id, patch) => {
    const cur = txsRef.current.find((t) => t.id === id);
    if (!cur) return false;
    if (patch.amount != null) patch = { ...patch, amount: round2(patch.amount) };
    const prev = cur._prev || clean(cur);
    if (isTmp(id)) {
      // encara no existeix al servidor: actualitza el payload pendent
      patchRow(id, (t) => ({ ...t, ...patch, _pending: t._pending ? { ...t._pending, payload: { ...t._pending.payload, ...patch } } : t._pending }));
      return true;
    }
    patchRow(id, (t) => ({ ...t, ...patch, _prev: prev, _sync: 'saving' }));
    return runUpdate(id, patch);
  }, [patchRow, runUpdate]);

  const removeTx = useCallback(async (id) => {
    const cur = txsRef.current.find((t) => t.id === id);
    if (!cur) return;
    setTxs((ts) => ts.filter((t) => t.id !== id));
    if (isTmp(id)) return;
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) setTxs((ts) => [{ ...cur, _sync: 'error', _pending: { type: 'delete' } }, ...ts]);
  }, [setTxs]);

  const retryTx = useCallback(async (id) => {
    const cur = txsRef.current.find((t) => t.id === id);
    if (!cur?._pending) return;
    const p = cur._pending;
    patchRow(id, (t) => ({ ...t, _sync: 'saving' }));
    if (p.type === 'insert') return runInsert(id, p.payload);
    if (p.type === 'update') return runUpdate(id, p.patch);
    if (p.type === 'delete') {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) patchRow(id, (t) => ({ ...t, _sync: 'error' }));
      else setTxs((ts) => ts.filter((t) => t.id !== id));
    }
  }, [patchRow, runInsert, runUpdate, setTxs]);

  const retryAll = useCallback(async () => {
    for (const t of txsRef.current.filter((x) => x._sync === 'error')) await retryTx(t.id);
  }, [retryTx]);

  const discardTx = useCallback((id) => {
    const cur = txsRef.current.find((t) => t.id === id);
    if (!cur) return;
    if (isTmp(id) || cur._pending?.type === 'insert') setTxs((ts) => ts.filter((t) => t.id !== id));
    else if (cur._prev) patchRow(id, () => ({ ...cur._prev }));
    else patchRow(id, (t) => clean(t));
  }, [patchRow, setTxs]);

  /** Importació massiva per lots. Retorna {inserted, failed}. */
  const importRows = useCallback(async (rows, onProgress) => {
    let inserted = 0, failed = 0;
    const size = 400;
    for (let i = 0; i < rows.length; i += size) {
      const chunk = rows.slice(i, i + size).map((r) => ({ source: 'import', ...r, amount: round2(r.amount) }));
      const { data, error } = await supabase.from('transactions').insert(chunk).select(TX_COLS);
      if (error) {
        failed += chunk.length;
        setTxs((ts) => [...chunk.map((p) => ({ id: newTmp(), created_at: new Date().toISOString(), ...p, _sync: 'error', _pending: { type: 'insert', payload: p } })), ...ts]);
      } else {
        inserted += data.length;
        setTxs((ts) => [...data.map((d) => ({ ...d, amount: Number(d.amount) })), ...ts]);
      }
      onProgress?.(Math.min(i + size, rows.length), rows.length);
    }
    return { inserted, failed };
  }, [setTxs]);

  const setSetting = useCallback(async (key, value) => {
    setState((s) => ({ ...s, settings: { ...s.settings, [key]: value } }));
    const { error } = await supabase.from('settings').upsert({ key, value }, { onConflict: 'key' });
    return !error;
  }, []);

  const setBudget = useCallback(async (catId, amount) => {
    setState((s) => ({ ...s, cats: s.cats.map((c) => (c.id === catId ? { ...c, monthly_budget: amount } : c)) }));
    const { error } = await supabase.from('categories').update({ monthly_budget: amount }).eq('id', catId);
    return !error;
  }, []);

  const dismissInsight = useCallback(async (id) => {
    setState((s) => ({ ...s, insights: s.insights.filter((i) => i.id !== id) }));
    await supabase.from('insights').update({ dismissed: true }).eq('id', id);
  }, []);

  const catById = useMemo(() => new Map(state.cats.map((c) => [c.id, c])), [state.cats]);
  const catByCode = useMemo(() => new Map(state.cats.map((c) => [c.code, c])), [state.cats]);

  return { ...state, catById, catByCode, reload: load, addTx, updateTx, removeTx, retryTx, retryAll, discardTx, importRows, setSetting, setBudget, dismissInsight };
}
