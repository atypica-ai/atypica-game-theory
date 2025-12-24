// BACKUP: Previous background style with gradient and corner glows
// To restore this background, say: "使用备份的背景图"

{/* Softer gradient background */}
<div className="absolute inset-0 z-0 bg-gradient-to-br from-rose-50 via-amber-50 to-sky-50 dark:from-zinc-900 dark:via-zinc-950 dark:to-zinc-950">
  {/* Lighter corner glows */}
  <div className="absolute -top-24 -left-24 w-[420px] h-[420px] bg-gradient-to-br from-rose-200/25 to-transparent rounded-full blur-3xl" />
  <div className="absolute -bottom-32 -right-16 w-[420px] h-[420px] bg-gradient-to-tl from-sky-200/25 to-transparent rounded-full blur-3xl dark:from-brand-green/20 dark:to-transparent" />
</div>

