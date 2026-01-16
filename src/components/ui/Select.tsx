function cn(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(" ");
}

export default function Select(
  props: React.SelectHTMLAttributes<HTMLSelectElement>
) {
  return (
    <select
      {...props}
      className={cn(
        "w-full appearance-none rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary",
        "bg-[linear-gradient(45deg,transparent_50%,#94a3b8_50%),linear-gradient(135deg,#94a3b8_50%,transparent_50%)] bg-[position:calc(100%-18px)_calc(1em+2px),calc(100%-13px)_calc(1em+2px)] bg-[size:6px_6px,6px_6px] bg-no-repeat pr-10",
        props.className
      )}
    />
  );
}

