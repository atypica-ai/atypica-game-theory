import { Button } from "@/components/ui/button";
import { ExternalLinkIcon } from "lucide-react";
import Link from "next/link";

const steps = [
  {
    title: "Join",
    description: (
      <>
        <Link
          href="https://friends.atypica.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium underline underline-offset-4 hover:text-primary transition-colors"
        >
          Sign up
        </Link>{" "}
        for the affiliate program and get your unique referral link
      </>
    ),
  },
  {
    title: "Promote",
    description: (
      <>
        Share your unique link and track performance in real-time via{" "}
        <Link
          href="https://friends.atypica.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium underline underline-offset-4 hover:text-primary transition-colors"
        >
          Tolt
        </Link>
      </>
    ),
  },
  {
    title: "Earn",
    description: "Earn 30% commission on the first 3 payments within 3 months per customer",
  },
];

export function AffiliateEN() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-24 md:py-40 font-sans">
      {/* Hero Section */}
      <header className="text-center mb-20 md:mb-40">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-EuclidCircularA font-medium tracking-tight mb-6">
          Get Paid to Share atypica.AI
        </h1>
        <p className="text-lg md:text-xl text-zinc-600 dark:text-zinc-400 mb-8">
          Earn <span className="font-bold text-primary">30% </span>commission on the first 3
          payments within 3 months from every customer you refer
        </p>
        <Button size="lg" className="rounded-full has-[>svg]:px-8 px-8 h-12" asChild>
          <Link href="https://friends.atypica.ai" target="_blank" rel="noopener noreferrer">
            Join Affiliate Program
            <ExternalLinkIcon className="h-4 w-4" />
          </Link>
        </Button>
      </header>

      {/* How it Works Section */}
      <section className="mb-16 md:mb-20">
        <h2 className="text-3xl md:text-4xl font-EuclidCircularA font-medium mb-12 text-center">
          How it Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step, index) => (
            <div
              key={step.title}
              className="bg-muted p-6 rounded-2xl border hover:-translate-y-1 transition-all duration-300"
            >
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-semibold text-base mb-4 mx-auto ring-1 ring-border">
                {index + 1}
              </div>
              <h3 className="text-xl font-semibold mb-3 text-center">{step.title}</h3>
              <p className="text-sm text-muted-foreground text-center leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="mb-20 md:mb-40 text-center">
        <Button size="lg" className="rounded-full has-[>svg]:px-8 px-8 h-12" asChild>
          <Link href="https://friends.atypica.ai" target="_blank" rel="noopener noreferrer">
            Join Affiliate Program
            <ExternalLinkIcon className="h-4 w-4" />
          </Link>
        </Button>
      </section>

      {/* Help Section */}
      <section className="text-center">
        <h2 className="text-2xl md:text-3xl font-EuclidCircularA font-medium mb-4">Questions?</h2>
        <p className="text-lg text-muted-foreground mb-8">
          Chat with our AI sage for instant answers
        </p>
        <Button
          variant="outline"
          size="lg"
          className="rounded-full has-[>svg]:px-8 px-8 h-12"
          asChild
        >
          <Link href="/sage/profile/jv62NzUkJjfsbhxq" target="_blank" rel="noopener noreferrer">
            Chat with Sage
            <ExternalLinkIcon className="h-4 w-4" />
          </Link>
        </Button>
      </section>
    </div>
  );
}
