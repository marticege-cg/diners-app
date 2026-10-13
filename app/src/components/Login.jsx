import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Button } from './ui/button';
import { Input, Label } from './ui/input';

export function Login() {
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
  return (
    <div className="grid min-h-screen place-items-center p-4">
      <form onSubmit={submit} className="w-full max-w-[340px] space-y-4 rounded-xl border bg-card p-6 shadow-xl">
        <div className="flex items-center gap-2.5">
          <div className="grid size-9 place-items-center rounded-lg bg-primary text-lg font-bold text-primary-foreground">€</div>
          <div><div className="text-lg font-semibold leading-tight">Diners</div><div className="text-xs text-muted-foreground">Accés privat</div></div>
        </div>
        <div className="space-y-1"><Label htmlFor="em">Correu</Label><Input id="em" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
        <div className="space-y-1"><Label htmlFor="pw">Contrasenya</Label><Input id="pw" type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} required autoFocus /></div>
        {err && <p className="text-xs text-destructive" role="alert">{err}</p>}
        <Button type="submit" className="w-full" disabled={busy || !pw}>{busy && <Loader2 className="animate-spin" />}Entra</Button>
      </form>
    </div>
  );
}
