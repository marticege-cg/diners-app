import { cn, catColor } from '../../lib/utils';

export function Badge({ className, ...p }) {
  return <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-4', className)} {...p} />;
}

export function CatBadge({ code, name, emoji, className }) {
  const c = catColor(code);
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-4 whitespace-nowrap', className)}
      style={{ background: c + '1f', color: `color-mix(in srgb, ${c} var(--cat-mix, 100%), black)`, borderColor: c + '55' }}>
      {emoji ? <span>{emoji}</span> : null}{name}
    </span>
  );
}
