import { cn } from '../../lib/utils';

export const Card = ({ className, ...p }) => <div className={cn('rounded-lg border bg-card text-card-foreground shadow-sm', className)} {...p} />;
export const CardHeader = ({ className, ...p }) => <div className={cn('flex items-center justify-between gap-2 px-4 pt-3.5 pb-2', className)} {...p} />;
export const CardTitle = ({ className, ...p }) => <h3 className={cn('text-[13px] font-semibold tracking-tight', className)} {...p} />;
export const CardContent = ({ className, ...p }) => <div className={cn('px-4 pb-4', className)} {...p} />;
