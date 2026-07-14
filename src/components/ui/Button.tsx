function cn(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(" ");
}

export default function Button({
  children,
  variant = "primary",
  size = "md",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "outline" | "dark";
  size?: "sm" | "md";
}) {
  const sizeStyles =
    size === "sm" ? "px-3 py-2 rounded-xl text-sm" : "px-4 py-2 rounded-xl text-sm";
  const styles =
    variant === "primary"
      ? "bg-brand-primary text-white hover:bg-brand-deep"
      : variant === "secondary"
      ? "bg-brand-gold text-slate-900 hover:opacity-90"
      : variant === "dark"
      ? "bg-slate-950 text-white hover:bg-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
      : "border border-slate-300 bg-white hover:bg-slate-50 text-slate-900 dark:border-slate-700 dark:bg-slate-900/40 dark:hover:bg-slate-900 dark:text-slate-100";

  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap align-middle font-medium leading-none transition disabled:cursor-not-allowed disabled:opacity-50",
        "[&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:pointer-events-none",
        sizeStyles,
        styles,
        props.className
      )}
    >
      {children}
    </button>
  );
}

