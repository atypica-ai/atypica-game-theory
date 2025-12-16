export default function Loading() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8 animate-pulse">
        <div className="mb-4 h-10 w-3/4 rounded bg-muted" />
        <div className="h-4 w-32 rounded bg-muted" />
      </div>
      <div className="space-y-4 animate-pulse">
        <div className="h-4 w-full rounded bg-muted" />
        <div className="h-4 w-full rounded bg-muted" />
        <div className="h-4 w-full rounded bg-muted" />
        <div className="h-4 w-4/5 rounded bg-muted" />
        <div className="h-8 w-full" />
        <div className="h-4 w-full rounded bg-muted" />
        <div className="h-4 w-full rounded bg-muted" />
        <div className="h-4 w-3/4 rounded bg-muted" />
      </div>
    </article>
  );
}
