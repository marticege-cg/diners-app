import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Button } from './ui/button';
import { Input, Label } from './ui/input';

const APP_URL = 'https://marticege-cg.github.io/diners-app/';

function Shell({ onSubmit, subtitle, children }) {
  return (
    <div className="grid min-h-screen place-items-center p-4">
      <form onSubmit={onSubmit} className="w-full max-w-[340px] space-y-4 rounded-xl border bg-card p-6 shadow-xl">
        <div className="flex items-center gap-2.5">
          <div className="grid size-9 place-items-center rounded-lg bg-primary text-lg font-bold text-primary-foreground">€</div>
          <div><div className="text-lg font-semibold leading-tight">Diners</div><div className="text-xs text-muted-foreground">{subtitle}</div></div>
        </div>
        {children}
      </form>
    </div>
  );
}

export function Login() {
  const [mode, setMode] = useState('login'); // login | forgot | sent
  const [email, setEmail] = useState('marticege@gmail.com');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr('');
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw });
    if (error) setErr(/confirm/i.test(error.message) ? 'Cal confirmar el correu abans d\'entrar.' : /invalid/i.test(error.message) ? 'Correu o contrasenya incorrectes.' : error.message);
    setBusy(false);
  }

  async function sendReset(e) {
    e.preventDefault();
    setBusy(true); setErr('');
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: APP_URL });
    if (error) setErr(/rate|seconds|limit/i.test(error.message) ? 'Massa intents. Espera uns minuts i torna-ho a provar.' : error.message);
    else setMode('sent');
    setBusy(false);
  }

  if (mode === 'sent') {
    return (
      <Shell onSubmit={(e) => { e.preventDefault(); setMode('login'); }} subtitle="Recuperar l'accés">
        <p className="text-sm">Si el correu és correcte, t'hem enviat un enllaç per crear una contrasenya nova. Obre'l des d'aquest mateix dispositiu.</p>
        <p className="text-xs text-muted-foreground">Mira també la carpeta de correu brossa.</p>
        <Button type="submit" variant="outline" className="w-full">Torna a l'inici de sessió</Button>
      </Shell>
    );
  }
  if (mode === 'forgot') {
    return (
      <Shell onSubmit={sendReset} subtitle="Recuperar l'accés">
        <div className="space-y-1"><Label htmlFor="em">Correu</Label><Input id="em" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
        {err && <p className="text-xs text-destructive" role="alert">{err}</p>}
        <Button type="submit" className="w-full" disabled={busy || !email}>{busy && <Loader2 className="animate-spin" />}Envia l'enllaç</Button>
        <button type="button" className="w-full text-center text-xs text-muted-foreground hover:text-foreground" onClick={() => { setMode('login'); setErr(''); }}>Torna enrere</button>
      </Shell>
    );
  }
  return (
    <Shell onSubmit={submit} subtitle="Accés privat">
      <div className="space-y-1"><Label htmlFor="em">Correu</Label><Input id="em" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
      <div className="space-y-1"><Label htmlFor="pw">Contrasenya</Label><Input id="pw" type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} required autoFocus /></div>
      {err && <p className="text-xs text-destructive" role="alert">{err}</p>}
      <Button type="submit" className="w-full" disabled={busy || !pw}>{busy && <Loader2 className="animate-spin" />}Entra</Button>
      <button type="button" className="w-full text-center text-xs text-muted-foreground hover:text-foreground" onClick={() => { setMode('forgot'); setErr(''); }}>He oblidat la contrasenya</button>
    </Shell>
  );
}

export function NewPassword({ onDone }) {
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (pw.length < 8) return setErr('Mínim 8 caràcters.');
    if (pw !== pw2) return setErr('Les dues contrasenyes no coincideixen.');
    setBusy(true); setErr('');
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setErr(error.message);
    onDone();
  }
  return (
    <Shell onSubmit={submit} subtitle="Contrasenya nova">
      <div className="space-y-1"><Label htmlFor="n1">Contrasenya nova</Label><Input id="n1" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} required autoFocus /></div>
      <div className="space-y-1"><Label htmlFor="n2">Repeteix-la</Label><Input id="n2" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} required /></div>
      {err && <p className="text-xs text-destructive" role="alert">{err}</p>}
      <Button type="submit" className="w-full" disabled={busy || !pw || !pw2}>{busy && <Loader2 className="animate-spin" />}Desa i entra</Button>
    </Shell>
  );
}
