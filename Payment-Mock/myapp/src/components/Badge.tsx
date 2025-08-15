// src/components/Badge.tsx

export function Badge({
  color,
  children,
}: {
  color: "green" | "red" | "gray";
  children: React.ReactNode;
}) {
  const map = {
    green: "bg-green-100 text-green-800",
    red: "bg-red-100 text-red-800",
    gray: "bg-gray-100 text-gray-800",
  } as const;
  return (
    <span className={`px-2 py-1 rounded text-sm font-medium ${map[color]}`}>
      {children}
    </span>
  );
}
