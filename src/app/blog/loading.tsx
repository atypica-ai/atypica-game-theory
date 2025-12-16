export default function Loading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-12 animate-pulse">
        <div className="mb-4 h-12 w-48 rounded bg-muted" />
        <div className="h-6 w-96 rounded bg-muted" />
      </div>

      <div className="grid gap-8">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="border-b pb-8 animate-pulse">
            <div className="space-y-3">
              <div className="h-8 w-3/4 rounded bg-muted" />
              <div className="h-4 w-32 rounded bg-muted" />
              <div className="h-4 w-full rounded bg-muted" />
              <div className="h-4 w-full rounded bg-muted" />
              <div className="h-4 w-2/3 rounded bg-muted" />
              <div className="h-4 w-24 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
