function cn(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(" ");
}

export default function Card({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }) {
  return (
    <div
      {...props}
      className={cn(
        "rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children }: { children: React.ReactNode }) {
  return <div className="p-5 border-b border-slate-100 dark:border-slate-800">{children}</div>;
}

export function CardBody({ children }: { children: React.ReactNode }) {
  return <div className="p-5">{children}</div>;
}

