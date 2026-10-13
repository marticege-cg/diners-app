import * as D from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

export const Dialog = D.Root;

export function DialogContent({ className, children, title, description, ...props }) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0" />
      <D.Content
        className={cn('fixed left-1/2 top-1/2 z-50 flex max-h-[92vh] w-[calc(100vw-1rem)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-lg border bg-card shadow-2xl focus:outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95', className)}
        {...props}>
        <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
          <div>
            <D.Title className="text-sm font-semibold">{title}</D.Title>
            {description ? <D.Description className="mt-0.5 text-xs text-muted-foreground">{description}</D.Description> : <D.Description className="sr-only">{title}</D.Description>}
          </div>
          <D.Close className="rounded p-1 text-muted-foreground hover:bg-muted" aria-label="Tanca"><X className="size-4" /></D.Close>
        </div>
        {children}
      </D.Content>
    </D.Portal>
  );
}
