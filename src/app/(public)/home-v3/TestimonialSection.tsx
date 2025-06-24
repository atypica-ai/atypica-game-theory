"use client";
import Image from "next/image";

const testimonials = [
  {
    category: "Customer stories",
    quote:
      "We needed to understand how different user segments would react to our new feature. Atypica's AI personas provided authentic feedback through detailed interviews, giving us insights in hours that would have taken weeks of traditional user research.",
    author: "Elena Rodriguez",
    title: "Senior Product Manager",
    image:
      "Professional headshot of a confident Latina product manager in a modern tech office, with a warm and engaging smile. Style: professional, bright, authentic.",
    bgColor: "bg-zinc-900 dark:bg-zinc-800",
    textColor: "text-white",
    className: "md:col-span-2",
  },
  {
    category: "Time Saved",
    stat: "90%",
    description: "Reduction in research time, from weeks to hours.",
    bgColor: "bg-yellow-300",
    textColor: "text-zinc-900",
    className: "md:col-span-1",
  },
  {
    category: "Customer stories",
    quote:
      "The behavioral digital twins were incredibly realistic in their responses. We tested multiple campaign messages through persona interviews and identified the most effective approach before spending on actual ads.",
    author: "Ben Carter",
    title: "Marketing Director",
    image:
      "Professional headshot of a Black marketing director, looking thoughtfully at the camera with a slight smile, in a creative agency setting. Style: clean, professional, inspiring.",
    bgColor: "bg-zinc-200 dark:bg-zinc-700",
    textColor: "text-zinc-900 dark:text-white",
    className: "md:col-span-1",
  },
  {
    category: "Customer stories",
    quote:
      "As a startup, we couldn't afford traditional focus groups or extensive user interviews. Atypica's AI persona research gave us deep behavioral insights and validated our assumptions at a fraction of the cost.",
    author: "Sophie Chen",
    title: "Founder & CEO",
    image:
      "Professional headshot of a young Asian female founder in a startup environment, looking confident and determined. Style: natural light, modern, entrepreneurial.",
    bgColor: "bg-zinc-700 dark:bg-zinc-600",
    textColor: "text-white",
    className: "md:col-span-2",
  },
];

export function TestimonialSection() {
  return (
    <>
      {/* Testimonial Section */}
      <section className="bg-zinc-50 dark:bg-black py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="font-EuclidCircularA font-medium text-4xl md:text-5xl tracking-tight">
              Research Teams Love Our Results
            </h2>
            <p className="max-w-3xl mx-auto mt-5 text-lg text-zinc-600 dark:text-zinc-400">
              See how professionals use AI persona research to understand consumer behavior and make
              better decisions faster.
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
                    {testimonial.category}
                  </p>

                  {testimonial.stat ? (
                    <div className="flex-1 flex flex-col justify-center text-center">
                      <div className="text-6xl md:text-7xl font-bold mb-2">{testimonial.stat}</div>
                      <p className="text-lg">{testimonial.description}</p>
                    </div>
                  ) : (
                    <>
                      <blockquote className="text-lg md:text-xl leading-relaxed flex-1 mb-6">
                        "{testimonial.quote}"
                      </blockquote>

                      {testimonial.image && (
                        <div className="flex items-center gap-4 mt-auto">
                          <div className="w-12 h-12 rounded-full overflow-hidden">
                            <Image
                              src={`/api/imagegen/dev/${testimonial.image}`}
                              alt={`${testimonial.author} testimonial`}
                              className="object-cover"
                              width={48}
                              height={48}
                            />
                          </div>
                          <div>
                            {testimonial.author && (
                              <p className="font-semibold">{testimonial.author}</p>
                            )}
                            {testimonial.title && (
                              <p className="text-sm opacity-80">{testimonial.title}</p>
                            )}
                          </div>
                        </div>
                      )}

                      {testimonial.author && !testimonial.image && (
                        <div className="mt-auto">
                          <p className="font-semibold">{testimonial.author}</p>
                          {testimonial.title && (
                            <p className="text-sm opacity-80">{testimonial.title}</p>
                          )}
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
