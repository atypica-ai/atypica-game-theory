export function HeroTitle({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="relative mb-6">
      <span
        className="max-sm:hidden absolute top-1/2 -translate-y-1/2 rounded-full -left-10 size-5"
        style={{ backgroundColor: "#1bff1b" }}
      ></span>
      <span
        className="sm:hidden absolute left-1/2 -translate-x-1/2 rounded-full -top-2 w-16 h-0.5"
        style={{ backgroundColor: "#1bff1b" }}
      ></span>
      {children}
    </h1>
  );
}
