import { cva } from 'class-variance-authority';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '../../lib/utils';

const variants = cva(
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'bg-muted text-foreground hover:bg-muted/70 border',
        outline: 'border bg-transparent hover:bg-muted',
        ghost: 'hover:bg-muted',
        destructive: 'bg-destructive text-white hover:bg-destructive/90',
      },
      size: { default: 'h-9 px-3.5', sm: 'h-8 px-2.5 text-xs', xs: 'h-6 px-2 text-[11px]', icon: 'h-8 w-8' },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export function Button({ className, variant, size, asChild, ...props }) {
  const Comp = asChild ? Slot : 'button';
  return <Comp className={cn(variants({ variant, size }), className)} {...props} />;
}
