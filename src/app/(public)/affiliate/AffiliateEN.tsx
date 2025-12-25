import { Button } from "@/components/ui/button";
import { ExternalLinkIcon } from "lucide-react";
import Link from "next/link";
import React from "react";

export const AffiliateEN: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto px-6 py-24 md:py-40 font-sans">
      {/* Hero Section */}
      <header className="text-center mb-20 md:mb-24">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-EuclidCircularA font-medium tracking-tight mb-6">
          Join Atypica Affiliate Program
        </h1>
        <p className="text-lg md:text-xl text-zinc-600 dark:text-zinc-400 max-w-3xl mx-auto mb-8">
          Partner with Atypica and earn 30% commission on the first 3 payments for customers you refer
        </p>
        <Button
          size="lg"
          className="rounded-full has-[>svg]:px-8 px-8 h-12"
          asChild
        >
          <Link
            href="https://friends.atypica.ai"
            target="_blank"
            rel="noopener noreferrer"
          >
            Become an Affiliate
            <ExternalLinkIcon className="h-4 w-4" />
          </Link>
        </Button>
      </header>

      {/* How it Works Section */}
      <section className="mb-16 md:mb-20">
        <h2 className="text-3xl md:text-4xl font-EuclidCircularA font-medium mb-12 text-center text-zinc-900 dark:text-zinc-100">
          How it Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Step 1: Sign up */}
          <div className="bg-zinc-50 dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:-translate-y-1 transition-all duration-300">
            <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-zinc-700 dark:text-zinc-300 font-semibold text-base mb-4 mx-auto">
              1
            </div>
            <h3 className="text-xl font-semibold mb-3 text-zinc-900 dark:text-zinc-100 text-center">
              Sign up
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 text-center">
              Join our affiliate program and get your unique referral link
            </p>
          </div>

          {/* Step 2: Share Atypica */}
          <div className="bg-zinc-50 dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:-translate-y-1 transition-all duration-300">
            <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-zinc-700 dark:text-zinc-300 font-semibold text-base mb-4 mx-auto">
              2
            </div>
            <h3 className="text-xl font-semibold mb-3 text-zinc-900 dark:text-zinc-100 text-center">
              Share Atypica
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 text-center">
              Promote Atypica to your network and community with the link
            </p>
          </div>

          {/* Step 3: Track Performance */}
          <div className="bg-zinc-50 dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:-translate-y-1 transition-all duration-300">
            <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-zinc-700 dark:text-zinc-300 font-semibold text-base mb-4 mx-auto">
              3
            </div>
            <h3 className="text-xl font-semibold mb-3 text-zinc-900 dark:text-zinc-100 text-center">
              Track Performance
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 text-center">
              Monitor your referrals and conversions in personal dashboard
            </p>
          </div>

          {/* Step 4: Earn Commission */}
          <div className="bg-zinc-50 dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:-translate-y-1 transition-all duration-300">
            <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-zinc-700 dark:text-zinc-300 font-semibold text-base mb-4 mx-auto">
              4
            </div>
            <h3 className="text-xl font-semibold mb-3 text-zinc-900 dark:text-zinc-100 text-center">
              Earn Commission
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 text-center">
              Get 30% commission for first 3 successful payment within 3 months
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="mb-16 md:mb-20 text-center bg-zinc-50 dark:bg-zinc-900 p-12 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow duration-300">
        <h2 className="text-2xl md:text-3xl font-EuclidCircularA font-medium mb-4 text-zinc-900 dark:text-zinc-100">
          Ready to Get Started?
        </h2>
        <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-8 max-w-2xl mx-auto">
          Join our affiliate program to help shape the future of AI-powered market and consumer
          research while earning commission.
        </p>
        <Button
          size="lg"
          className="rounded-full has-[>svg]:px-8 px-8 h-12"
          asChild
        >
          <Link
            href="https://friends.atypica.ai"
            target="_blank"
            rel="noopener noreferrer"
          >
            Become an Affiliate
            <ExternalLinkIcon className="h-4 w-4" />
          </Link>
        </Button>
      </section>

      {/* Help Section */}
      <section className="text-center">
        <h2 className="text-2xl md:text-3xl font-EuclidCircularA font-medium mb-4 text-zinc-900 dark:text-zinc-100">
          Need any help?
        </h2>
        <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-8 max-w-2xl mx-auto break-words hyphens-auto">
          If you have any questions about the affiliate program, click below and chat with our sage to get answers and support.
        </p>
        <Button
          variant="outline"
          size="lg"
          className="rounded-full has-[>svg]:px-8 px-8 h-12"
          asChild
        >
          <Link
            href="https://atypica.ai/sage/profile/jv62NzUkJjfsbhxq"
            target="_blank"
            rel="noopener noreferrer"
          >
            Chat with AI Sage
            <ExternalLinkIcon className="h-4 w-4" />
          </Link>
        </Button>
      </section>
    </div>
  );
};

