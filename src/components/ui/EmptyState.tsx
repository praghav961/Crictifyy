import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-dashed border-border bg-surface/50", className)}>
      <div className="h-12 w-12 rounded-xl bg-surface-hover flex items-center justify-center mb-4 text-foreground-muted">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-lg font-bold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-foreground-muted mb-4 max-w-sm">{description}</p>
      {action}
    </div>
  );
}
