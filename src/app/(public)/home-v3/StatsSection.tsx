"use client";
const stats = [
  { id: 1, value: "50K", label: "AI Personas Created" },
  { id: 2, value: "100K", label: "Interviews Conducted" },
  { id: 3, value: "10", label: "Minutes Average Study Time" },
];

export function StatsSection() {
  return (
    <section className="bg-zinc-50 dark:bg-zinc-950 py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="font-EuclidCircularA font-medium text-3xl md:text-4xl mb-4">
            AI Persona Research at Scale
          </h2>
          <p className="font-EuclidCircularA font-medium text-3xl md:text-4xl">
            Building digital twins to understand{" "}
            <span className="italic font-InstrumentSerif">human decisions</span> through
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
            <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-4 py-2 rounded-full text-sm font-medium">
              🤖 AI Personas
            </span>
            <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-full text-sm font-medium">
              💬 Expert Interviews
            </span>
            <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-4 py-2 rounded-full text-sm font-medium">
              📊 Behavioral Insights
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {stats.map((stat) => (
            <div key={stat.id} className="text-center">
              <div className="text-6xl md:text-7xl font-bold mb-2">
                <span className="text-4xl md:text-5xl align-top">+</span>
                {stat.value}
              </div>
              <div className="text-zinc-600 dark:text-zinc-400 text-sm font-medium uppercase tracking-wider">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
