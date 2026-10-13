import { LayoutDashboard, ListOrdered, TrendingUp as TrendIcon, Settings, LogOut, Wallet, Banknote, Landmark, TrendingUp, Sun, Moon, RefreshCw } from 'lucide-react';
import { cn, eur } from '../lib/utils';
import { Button } from './ui/button';
import { PrivacyToggle } from '../lib/privacy';

export const NAV = [
  { id: 'dashboard', label: 'Panell', Icon: LayoutDashboard },
  { id: 'moviments', label: 'Moviments', Icon: ListOrdered },
  { id: 'inversions', label: 'Inversions', Icon: TrendIcon },
  { id: 'config', label: 'Objectius', Icon: Settings },
];

const ACC_ICON = { cash: Banknote, invest: TrendingUp, investment: TrendingUp };
const accIcon = (a) => ACC_ICON[a.kind] || Landmark;

export function AccountSelector({ accounts, balances, value, onChange, className }) {
  return (
    <div className={cn('space-y-0.5', className)}>
      <AccRow active={value === 'all'} onClick={() => onChange('all')} Icon={Wallet} name="Tots els comptes" amount={null} />
      {accounts.map((a) => (
        <AccRow key={a.id} active={value === a.id} onClick={() => onChange(a.id)} Icon={accIcon(a)} name={a.name} amount={balances.get(a.id)} />
      ))}
    </div>
  );
}

function AccRow({ active, onClick, Icon, name, amount }) {
  return (
    <button onClick={onClick} className={cn('flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors', active ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground')}>
      <Icon className="size-4 shrink-0" />
      <span className="flex-1 truncate">{name}</span>
      {amount != null && <span className="money num text-xs">{eur(amount)}</span>}
    </button>
  );
}

export function Sidebar({ view, setView, total, accounts, balances, account, setAccount, email, onLogout, theme, toggleTheme, onRefresh, loading }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col gap-4 border-r bg-card/40 p-3 lg:flex">
      <div className="flex items-center justify-between px-1 pt-1">
        <div className="flex items-center gap-2">
          <div className="grid size-7 place-items-center rounded-md bg-primary text-sm font-bold text-primary-foreground">€</div>
          <span className="text-[15px] font-semibold tracking-tight">Diners</span>
        </div>
        <Button variant="ghost" size="icon" onClick={onRefresh} title="Refresca" aria-label="Refresca"><RefreshCw className={cn('size-3.5', loading && 'animate-spin')} /></Button>
      </div>

      <nav className="space-y-0.5">
        {NAV.map(({ id, label, Icon }) => (
          <button key={id} onClick={() => setView(id)} className={cn('flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] font-medium transition-colors', view === id ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground')}>
            <Icon className="size-4" />{label}
          </button>
        ))}
      </nav>

      <div className="rounded-lg border bg-card p-3">
        <div className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">Balanç consolidat</div>
        <div className="money money-lg num mt-1 text-2xl font-semibold tracking-tight">{eur(total)}</div>
        <div className="mt-0.5 text-[11px] text-muted-foreground">{accounts.length} comptes</div>
      </div>

      <div>
        <div className="mb-1 px-2 text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">Comptes</div>
        <AccountSelector accounts={accounts} balances={balances} value={account} onChange={setAccount} />
      </div>

      <div className="mt-auto flex items-center gap-1 border-t pt-3">
        <div className="min-w-0 flex-1 truncate px-1 text-[11px] text-muted-foreground" title={email}>{email}</div>
        <PrivacyToggle />
        <Button variant="ghost" size="icon" onClick={toggleTheme} title="Canvia el tema" aria-label="Canvia el tema">{theme === 'dark' ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}</Button>
        <Button variant="ghost" size="icon" onClick={onLogout} title="Tanca la sessió" aria-label="Tanca la sessió"><LogOut className="size-3.5" /></Button>
      </div>
    </aside>
  );
}

export function BottomNav({ view, setView }) {
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 flex border-t bg-card/95 pt-1.5 backdrop-blur lg:hidden">
      {NAV.map(({ id, label, Icon }) => (
        <button key={id} onClick={() => setView(id)} className={cn('flex flex-1 flex-col items-center gap-0.5 py-1 text-[10.5px] font-medium', view === id ? 'text-primary' : 'text-muted-foreground')}>
          <Icon className="size-5" />{label}
        </button>
      ))}
    </nav>
  );
}
