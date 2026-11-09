import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, RefreshCw, Moon, Sun, LogOut, AlertTriangle, Sparkles } from 'lucide-react';
import { supabase } from './lib/supabase';
import { useStore } from './lib/useStore';
import { balances as calcBalances, summarize, autoInsights } from './lib/finance';
import { buildLearned } from './lib/categorize';
import { cn, eur, monthLabel, shiftMonth, todayISO, monthOf } from './lib/utils';
import { Login, NewPassword } from './components/Login';
import { Sidebar, BottomNav, AccountSelector } from './components/Sidebar';
import { Kpis } from './components/Kpis';
import { QuickAdd } from './components/QuickAdd';
import { CashCounter } from './components/CashCounter';
import { Dropzone, MappingModal } from './components/ImportFlow';
import { TxTable } from './components/TxTable';
import { MonthlyBars, Breakdown } from './components/Charts';
import { InsightsCard } from './components/Insights';
import { SettingsView } from './components/Settings';
import { InvestmentsMini, InvestmentsView } from './components/Investments';
import { NativeSelect } from './components/ui/input';
import { Button } from './components/ui/button';
import { PrivacyToggle } from './lib/privacy';
import { makePeriods } from './lib/period';
import { markNetted } from './lib/net';

function useTheme() {
  const [theme, setTheme] = useState(() => (document.documentElement.classList.contains('dark') ? 'dark' : 'light'));
  const toggle = () => {
    const n = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.classList.toggle('dark', n === 'dark');
    try { localStorage.setItem('diners-theme', n); } catch { /* ignore */ }
    setTheme(n);
  };
  return [theme, toggle];
}

export default function App() {
  const [session, setSession] = useState(undefined);
  // Enllaç de recuperació de contrasenya: cal demanar-ne una de nova abans d'entrar
  const [recovery, setRecovery] = useState(() => /type=recovery/.test(window.location.hash));
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session || null));
    const { data: sub } = supabase.auth.onAuthStateChange((e, s) => {
      if (e === 'PASSWORD_RECOVERY') setRecovery(true);
      setSession(s || null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);
  if (session === undefined) return <div className="grid min-h-screen place-items-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>;
  if (!session) return <Login />;
  if (recovery) return <NewPassword onDone={() => { setRecovery(false); history.replaceState(null, '', window.location.pathname); }} />;
  return <Main email={session.user.email} />;
}

function Main({ email }) {
  const store = useStore(true);
  const [theme, toggleTheme] = useTheme();
  const [view, setView] = useState('dashboard');
  const [account, setAccount] = useState('all');
  const [monthSel, setMonth] = useState(null);
  const [file, setFile] = useState(null);
  const logout = () => supabase.auth.signOut();

  const { cats, accounts, txs: rawTxs, catById, catByCode, settings, loading, error } = store;
  const cycleOn = settings.salary_cycle !== false;
  const cutoff = Number(settings.salary_cutoff_day ?? 25);
  const per = useMemo(() => makePeriods(rawTxs, catById, { enabled: cycleOn, cutoff }), [rawTxs, catById, cycleOn, cutoff]);
  const netOn = settings.net_refunds !== false;
  const txs = useMemo(() => markNetted(per.tag(rawTxs), catById, { enabled: netOn }), [per, rawTxs, catById, netOn]);
  const month = monthSel ?? per.current;
  const goal = Number(settings.goal_monthly_savings ?? 900);
  const bal = useMemo(() => {
    const m = calcBalances(accounts, txs);
    const t212 = accounts.find((a) => a.kind === 'invest' || a.kind === 'investment');
    if (t212 && store.inv.latest) m.set(t212.id, Number(store.inv.latest.total_value));
    return m;
  }, [accounts, txs, store.inv.latest]);
  const total = useMemo(() => [...bal.values()].reduce((s, v) => s + v, 0), [bal]);
  const learned = useMemo(() => buildLearned(txs, catById), [txs, catById]);
  const cur = useMemo(() => summarize(txs, catById, month, account), [txs, catById, month, account]);
  const prev = useMemo(() => summarize(txs, catById, shiftMonth(month, -1), account), [txs, catById, month, account]);
  const auto = useMemo(() => autoInsights({ txs, cats, catById, month, goal, accountId: account, current: per.current }), [txs, cats, catById, month, goal, account, per]);
  const budgetTotal = cats.filter((c) => c.kind === 'expense').reduce((s, c) => s + (c.monthly_budget || 0), 0);

  const nErr = txs.filter((t) => t._sync === 'error').length;
  const nPend = txs.filter((t) => t.status === 'pending_ai').length;
  const nowMonth = per.current;
  const importStore = { ...store, learned };

  const tableProps = { txs, cats, catById, catByCode, accounts, accountId: account, month, onUpdate: store.updateTx, onRemove: store.removeTx, onRetry: store.retryTx, onDiscard: store.discardTx };

  const monthNav = (
    <div className="flex items-center gap-1">
      <Button variant="outline" size="icon" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Mes anterior"><ChevronLeft /></Button>
      <div className="min-w-[128px] text-center">
        <div className="text-sm font-semibold leading-tight">{monthLabel(month)}</div>
        {per.range(month) && <div className="text-[10px] leading-tight text-muted-foreground">{per.range(month)}</div>}
      </div>
      <Button variant="outline" size="icon" onClick={() => setMonth(shiftMonth(month, 1))} disabled={month >= nowMonth} aria-label="Mes següent"><ChevronRight /></Button>
    </div>
  );

  const syncChip = (
    <div className="flex items-center gap-1.5 text-[11px] font-medium">
      {nErr > 0 && <button onClick={store.retryAll} className="inline-flex items-center gap-1 rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-destructive"><AlertTriangle className="size-3" />{nErr} amb error · reintenta</button>}
      {nPend > 0 && <button onClick={() => setView('moviments')} className="inline-flex items-center gap-1 rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-warning"><Sparkles className="size-3" />{nPend} pendents d'IA</button>}
      {nErr === 0 && nPend === 0 && !loading && <span className="inline-flex items-center gap-1 text-success"><span className="size-1.5 rounded-full bg-success" />Tot desat</span>}
    </div>
  );

  return (
    <div className="flex min-h-screen">
      <Sidebar view={view} setView={setView} total={total} accounts={accounts} balances={bal} account={account} setAccount={setAccount}
        email={email} onLogout={logout} theme={theme} toggleTheme={toggleTheme} onRefresh={() => store.reload()} loading={loading} />

      <div className="min-w-0 flex-1">
        {/* capçalera mòbil */}
        <header className="pt-safe sticky top-0 z-20 border-b bg-background/95 backdrop-blur lg:hidden">
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="grid size-7 place-items-center rounded-md bg-primary text-sm font-bold text-primary-foreground">€</div>
            <div className="min-w-0 flex-1">
              <div className="money num text-base font-semibold leading-tight">{eur(total)}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Balanç total</div>
            </div>
            <NativeSelect className="h-8 w-[118px] text-xs" value={account} onChange={(e) => setAccount(e.target.value === 'all' ? 'all' : Number(e.target.value))} aria-label="Compte">
              <option value="all">Tots</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </NativeSelect>
            <PrivacyToggle />
            <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Tema">{theme === 'dark' ? <Sun /> : <Moon />}</Button>
            <Button variant="ghost" size="icon" onClick={logout} aria-label="Tanca la sessió"><LogOut /></Button>
          </div>
        </header>

        <main className="mx-auto max-w-[1560px] space-y-3 p-3 pb-24 lg:space-y-4 lg:p-5 lg:pb-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-semibold tracking-tight">{view === 'dashboard' ? 'Panell' : view === 'moviments' ? 'Moviments' : view === 'inversions' ? 'Inversions' : 'Objectius i pressupost'}</h1>
              {syncChip}
            </div>
            <div className="flex items-center gap-2">
              {(view === 'dashboard' || view === 'moviments') && monthNav}
              <Button variant="outline" size="icon" className="lg:hidden" onClick={() => store.reload()} aria-label="Refresca"><RefreshCw className={cn(loading && 'animate-spin')} /></Button>
            </div>
          </div>

          {error && (
            <div className="flex items-center justify-between gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
              <span className="flex items-center gap-2"><AlertTriangle className="size-4" />Error de sincronització: {error}</span>
              <Button size="sm" variant="outline" onClick={() => store.reload()}>Reintenta</Button>
            </div>
          )}

          {view === 'dashboard' && (<>
            <Kpis cur={cur} prev={prev} goal={goal} />
            <QuickAdd cats={cats} accounts={accounts} account={account} learned={learned} onAdd={store.addTx} />
            {(() => { const cash = accounts.find((a) => a.kind === 'cash'); return cash && <CashCounter account={cash} balance={bal[cash.id] ?? 0} catByCode={catByCode} onAdd={store.addTx} />; })()}
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_380px] xl:gap-4">
              <div className="min-w-0 space-y-3 xl:space-y-4">
                <Dropzone onFile={(name, buffer) => setFile({ name, buffer })} compact />
                <TxTable {...tableProps} maxHeight="560px" />
              </div>
              <div className="min-w-0 space-y-3 xl:space-y-4">
                <MonthlyBars txs={txs} catById={catById} month={month} accountId={account} goal={goal} />
                <InvestmentsMini inv={store.inv} onOpen={() => setView('inversions')} onRefresh={store.syncInv} />
                <Breakdown cur={cur} cats={cats} />
                <InsightsCard remote={store.insights} auto={auto} onDismiss={store.dismissInsight} />
              </div>
            </div>
          </>)}

          {view === 'moviments' && (<>
            <Dropzone onFile={(name, buffer) => setFile({ name, buffer })} compact />
            <TxTable {...tableProps} pageSizeDefault={50} title="Tots els moviments" />
          </>)}

          {view === 'inversions' && <InvestmentsView inv={store.inv} onRefresh={store.syncInv} onManual={store.addManualSnapshot} />}

          {view === 'config' && (
            <SettingsView cats={cats} goal={goal} cycleOn={cycleOn} cutoff={cutoff} netOn={netOn} setSetting={store.setSetting} setBudget={store.setBudget} summaryBudgetTotal={budgetTotal} onLogout={logout} />
          )}

          {loading && txs.length === 0 && <div className="grid place-items-center py-16"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>}
        </main>
      </div>

      <BottomNav view={view} setView={setView} />
      {file && !loading && accounts.length > 0 && <MappingModal file={file} onClose={() => setFile(null)} store={importStore} accountId={account} />}
    </div>
  );
}
