"use client";
import { useTranslations } from "next-intl";
import Image from "next/image";

const testimonials = [
  {
    id: "productManager",
    bgColor: "bg-zinc-900 dark:bg-zinc-800",
    textColor: "text-white",
    className: "md:col-span-2",
    image:
      "Professional headshot of a confident Latina product manager in a modern tech office, with a warm and engaging smile. Style: professional, bright, authentic.",
  },
  {
    id: "timeStat",
    bgColor: "bg-yellow-300",
    textColor: "text-zinc-900",
    className: "md:col-span-1",
  },
  {
    id: "marketingDirector",
    bgColor: "bg-zinc-200 dark:bg-zinc-700",
    textColor: "text-zinc-900 dark:text-white",
    className: "md:col-span-1",
    image:
      "Professional headshot of a Black marketing director, looking thoughtfully at the camera with a slight smile, in a creative agency setting. Style: clean, professional, inspiring.",
  },
  {
    id: "founder",
    bgColor: "bg-zinc-700 dark:bg-zinc-600",
    textColor: "text-white",
    className: "md:col-span-2",
    image:
      "Professional headshot of a young Asian female founder in a startup environment, looking confident and determined. Style: natural light, modern, entrepreneurial.",
  },
];

export function TestimonialSection() {
  const t = useTranslations("HomePageV3.TestimonialSection");
  return (
    <>
      {/* Testimonial Section */}
      <section className="bg-zinc-50 dark:bg-black py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="font-EuclidCircularA font-medium text-4xl md:text-5xl tracking-tight">
              {t("title")}
            </h2>
            <p className="max-w-3xl mx-auto mt-5 text-lg text-zinc-600 dark:text-zinc-400">
              {t("description")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className={`${testimonial.bgColor} ${testimonial.textColor} rounded-2xl p-8 flex flex-col ${testimonial.className}`}
              >
                <div className="h-full flex flex-col flex-grow">
                  <p className="text-xs uppercase tracking-wider opacity-60 mb-4">
                    {testimonial.id === "timeStat" ? t("timeCategory") : t("customerStoryCategory")}
                  </p>

                  {testimonial.id === "timeStat" ? (
                    <div className="flex-1 flex flex-col justify-center text-center">
                      <div className="text-6xl md:text-7xl font-bold mb-2">{t("timeStat")}</div>
                      <p className="text-lg">{t("timeDescription")}</p>
                    </div>
                  ) : (
                    <>
                      <blockquote className="text-lg md:text-xl leading-relaxed flex-1 mb-6">
                        &ldquo;
                        {testimonial.id === "productManager" &&
                          t("testimonials.productManager.quote")}
                        {testimonial.id === "marketingDirector" &&
                          t("testimonials.marketingDirector.quote")}
                        {testimonial.id === "founder" && t("testimonials.founder.quote")}&rdquo;
                      </blockquote>

                      {testimonial.image && (
                        <div className="flex items-center gap-4 mt-auto">
                          <div className="w-12 h-12 rounded-full overflow-hidden">
                            <Image
                              src={`/api/imagegen/dev/${testimonial.image}`}
                              alt={`${testimonial.id === "productManager" ? t("testimonials.productManager.author") : testimonial.id === "marketingDirector" ? t("testimonials.marketingDirector.author") : t("testimonials.founder.author")} testimonial`}
                              className="object-cover"
                              width={48}
                              height={48}
                            />
                          </div>
                          <div>
                            <p className="font-semibold">
                              {testimonial.id === "productManager" &&
                                t("testimonials.productManager.author")}
                              {testimonial.id === "marketingDirector" &&
                                t("testimonials.marketingDirector.author")}
                              {testimonial.id === "founder" && t("testimonials.founder.author")}
                            </p>
                            <p className="text-sm opacity-80">
                              {testimonial.id === "productManager" &&
                                t("testimonials.productManager.title")}
                              {testimonial.id === "marketingDirector" &&
                                t("testimonials.marketingDirector.title")}
                              {testimonial.id === "founder" && t("testimonials.founder.title")}
                            </p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
