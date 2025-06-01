"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { QuoteIcon, StarIcon } from "lucide-react";
import { useTranslations } from "next-intl";

const testimonials = [
  {
    key: "sarahChen",
    name: "Sarah Chen",
    role: "Product Manager",
    company: "TechFlow Inc",
    avatar: "/avatars/sarah.jpg",
    rating: 5,
    verified: true,
  },
  {
    key: "markJohnson",
    name: "Mark Johnson",
    role: "Research Director",
    company: "Innovate Labs",
    avatar: "/avatars/mark.jpg",
    rating: 5,
    verified: true,
  },
  {
    key: "emilyRodriguez",
    name: "Emily Rodriguez",
    role: "Strategy Consultant",
    company: "Global Insights",
    avatar: "/avatars/emily.jpg",
    rating: 5,
    verified: true,
  },
  {
    key: "davidKim",
    name: "David Kim",
    role: "VP of Marketing",
    company: "Growth Dynamics",
    avatar: "/avatars/david.jpg",
    rating: 5,
    verified: true,
  },
  {
    key: "rachelWilson",
    name: "Rachel Wilson",
    role: "Data Scientist",
    company: "Analytics Pro",
    avatar: "/avatars/rachel.jpg",
    rating: 5,
    verified: true,
  },
  {
    key: "alexMartinez",
    name: "Alex Martinez",
    role: "Business Analyst",
    company: "Market Edge",
    avatar: "/avatars/alex.jpg",
    rating: 5,
    verified: true,
  },
];

const getTestimonialQuote = (key: string) => {
  const quotes: Record<string, string> = {
    sarahChen:
      "atypica.AI transformed our market research process. What used to take our team weeks now happens in minutes, with even deeper insights than before.",
    markJohnson:
      "The AI's ability to analyze complex market dynamics and consumer behavior is remarkable. It's like having a team of senior analysts available 24/7.",
    emilyRodriguez:
      "We've used atypica.AI for competitor analysis and product development research. The insights have directly influenced our strategic roadmap.",
    davidKim:
      "The speed and quality of research reports is incredible. Our marketing campaigns are now backed by much more comprehensive market intelligence.",
    rachelWilson:
      "As a data scientist, I'm impressed by the AI's analytical capabilities. It consistently uncovers patterns that traditional methods miss.",
    alexMartinez:
      "atypica.AI has become an essential tool for our business analysis workflow. The ROI has been outstanding from day one.",
  };
  return quotes[key] || key;
};

export function TestimonialsSection() {
  const t = useTranslations();

  return (
    <div className="relative py-24 sm:py-32 bg-muted/30">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section header */}
        <div className="mx-auto max-w-2xl text-center mb-16">
          <Badge variant="outline" className="mb-4">
            Testimonials
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Trusted by business leaders worldwide
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            See how companies are using atypica.AI to drive strategic decisions
          </p>
        </div>

        {/* Testimonials grid */}
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((testimonial) => (
            <Card key={testimonial.key} className="relative overflow-hidden">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={testimonial.avatar} alt={testimonial.name} />
                      <AvatarFallback className="bg-primary/10 text-primary font-medium">
                        {testimonial.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm">{testimonial.name}</h4>
                        {testimonial.verified && (
                          <Badge variant="secondary" className="text-xs px-2 py-0">
                            Verified
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                      <p className="text-xs text-muted-foreground font-medium">
                        {testimonial.company}
                      </p>
                    </div>
                  </div>
                  <QuoteIcon className="h-5 w-5 text-primary/30" />
                </div>

                {/* Star rating */}
                <div className="flex items-center gap-1 mt-2">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <StarIcon key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
              </CardHeader>

              <CardContent>
                <blockquote className="text-sm leading-relaxed text-muted-foreground">
                  {getTestimonialQuote(testimonial.key)}
                </blockquote>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Bottom stats */}
        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <StarIcon key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <span className="font-medium">4.9/5</span>
            <span>•</span>
            <span>Based on 200+ reviews</span>
          </div>
        </div>
      </div>
    </div>
  );
}
