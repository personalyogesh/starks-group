export default function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      {children}
    </div>
  );
}

export function CardHeader({ children }: { children: React.ReactNode }) {
  return <div className="p-5 border-b border-slate-100">{children}</div>;
}

export function CardBody({ children }: { children: React.ReactNode }) {
  return <div className="p-5">{children}</div>;
}

