import { createContext, useContext, forwardRef, HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue | undefined>(undefined);

interface TabsProps extends HTMLAttributes<HTMLDivElement> {
  value: string;
  onValueChange: (value: string) => void;
}

export const Tabs = forwardRef<HTMLDivElement, TabsProps>(({ className, value, onValueChange, children, ...props }, ref) => (
  <TabsContext.Provider value={{ value, onValueChange }}>
    <div ref={ref} className={cn('w-full', className)} data-value={value} {...props}>
      {children}
    </div>
  </TabsContext.Provider>
));
Tabs.displayName = 'Tabs';

export const TabsList = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('inline-flex h-10 items-center justify-center rounded-lg bg-surface-hover p-1 text-foreground-muted', className)} {...props} />
));
TabsList.displayName = 'TabsList';

export const TabsTrigger = forwardRef<HTMLButtonElement, HTMLAttributes<HTMLButtonElement> & { value: string; isActive?: boolean }>(
  ({ className, value, isActive, onClick, ...props }, ref) => {
    const context = useContext(TabsContext);
    const active = isActive !== undefined ? isActive : (context?.value === value);

    return (
      <button
        ref={ref}
        type="button"
        role="tab"
        aria-selected={active}
        data-state={active ? 'active' : 'inactive'}
        onClick={(e) => {
          if (context?.onValueChange) {
            context.onValueChange(value);
          }
          if (onClick) {
            onClick(e as any);
          }
        }}
        className={cn(
          'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
          active ? 'bg-surface text-foreground shadow-sm' : 'hover:bg-surface-hover hover:text-foreground',
          className
        )}
        {...props}
      />
    );
  }
);
TabsTrigger.displayName = 'TabsTrigger';

export const TabsContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement> & { value: string; activeValue?: string }>(
  ({ className, value, activeValue, ...props }, ref) => {
    const context = useContext(TabsContext);
    const active = activeValue !== undefined ? activeValue === value : context?.value === value;
    
    if (!active) return null;
    
    return (
      <div
        ref={ref}
        role="tabpanel"
        data-state="active"
        className={cn('mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2', className)}
        {...props}
      />
    );
  });
TabsContent.displayName = 'TabsContent';
