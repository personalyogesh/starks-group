export default function Container({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={["max-w-6xl mx-auto px-4", className].filter(Boolean).join(" ")}>{children}</div>;
}

