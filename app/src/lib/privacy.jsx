import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from './utils';

// Mode privacitat: tots els imports queden pixelats fins que es toca un import (15 s) i tornen a pixelar-se.
export const REVEAL_MS = 15000;
const Ctx = createContext({ revealed: false, left: 0, reveal() {}, hide() {} });
export const usePrivacy = () => useContext(Ctx);

export function PrivacyProvider({ children }) {
  const [until, setUntil] = useState(0);
  const [now, setNow] = useState(Date.now());
  const revealed = until > now;
  const ref = useRef(false);
  ref.current = revealed;

  const reveal = useCallback(() => { const n = Date.now(); setNow(n); setUntil(n + REVEAL_MS); }, []);
  const hide = useCallback(() => setUntil(0), []);

  useEffect(() => { document.documentElement.dataset.privacy = revealed ? 'visible' : 'hidden'; }, [revealed]);
  useEffect(() => {
    if (!revealed) return undefined;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [revealed]);

  // Primer toc sobre un import: només el descobreix (no activa l'edició ni cap altra acció)
  useEffect(() => {
    const onClick = (e) => {
      if (ref.current) return;
      const el = e.target?.closest?.('.money');
      if (!el) return;
      e.preventDefault(); e.stopPropagation();
      reveal();
    };
    const onVis = () => { if (document.visibilityState === 'hidden') hide(); };
    document.addEventListener('click', onClick, true);
    document.addEventListener('visibilitychange', onVis);
    return () => { document.removeEventListener('click', onClick, true); document.removeEventListener('visibilitychange', onVis); };
  }, [reveal, hide]);

  const left = revealed ? Math.max(0, Math.ceil((until - now) / 1000)) : 0;
  return (
    <Ctx.Provider value={{ revealed, left, reveal, hide }}>
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
        <defs>
          <filter id="pixelate" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
            <feFlood x="3" y="3" height="1" width="1" />
            <feComposite width="7" height="7" />
            <feTile result="a" />
            <feComposite in="SourceGraphic" in2="a" operator="in" />
            <feMorphology operator="dilate" radius="3" />
          </filter>
          <filter id="pixelate-lg" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
            <feFlood x="6" y="6" height="1" width="1" />
            <feComposite width="13" height="13" />
            <feTile result="a" />
            <feComposite in="SourceGraphic" in2="a" operator="in" />
            <feMorphology operator="dilate" radius="6" />
          </filter>
        </defs>
      </svg>
      {children}
      <RevealPill />
    </Ctx.Provider>
  );
}

export function Money({ className, children, ...p }) {
  return <span className={cn('money', className)} {...p}>{children}</span>;
}

/** Embolcalla els imports (p. ex. "354 €", "1.940 €") d'un text amb <Money>. */
export function maskText(str) {
  if (typeof str !== 'string') return str;
  const parts = str.split(/(-?\d[\d.,]*\s?€)/g);
  return parts.map((s, i) => (i % 2 ? <Money key={i}>{s}</Money> : s));
}

export function PrivacyToggle({ className }) {
  const { revealed, reveal, hide } = usePrivacy();
  return (
    <button type="button" onClick={revealed ? hide : reveal} aria-label={revealed ? 'Amaga els imports' : 'Mostra els imports 15 segons'} title={revealed ? 'Amaga els imports' : 'Mostra els imports 15 s'}
      className={cn('grid size-8 place-items-center rounded-md hover:bg-muted', revealed && 'text-warning', className)}>
      {revealed ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
    </button>
  );
}

function RevealPill() {
  const { revealed, left, hide } = usePrivacy();
  if (!revealed) return null;
  return (
    <button type="button" onClick={hide} className="pb-safe fixed bottom-20 left-1/2 z-40 -translate-x-1/2 overflow-hidden rounded-full border border-warning/40 bg-card/95 px-4 py-1.5 text-xs font-medium shadow-lg backdrop-blur lg:bottom-5">
      <span className="num">Imports visibles · {left} s</span><span className="ml-2 text-muted-foreground">toca per amagar</span>
      <span className="absolute inset-x-0 bottom-0 h-0.5 bg-warning/70" style={{ width: `${(left / (REVEAL_MS / 1000)) * 100}%`, transition: 'width .2s linear' }} />
    </button>
  );
}
