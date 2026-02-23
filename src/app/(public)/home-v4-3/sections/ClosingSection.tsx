"use client";

import Link from "next/link";
import { CLOSING } from "../content";

export default function ClosingSection({
  register,
}: {
  register: (el: HTMLElement | null) => void;
}) {
  return (
    <section ref={register} className="relative z-2">
      <div className="relative z-2 py-24 px-6 pb-45 max-w-[1400px] mx-auto max-lg:py-15 max-lg:px-0">
        <h2 className="m-0 font-EuclidCircularA text-[clamp(32px,4.5vw,64px)] font-medium leading-none text-white max-w-[16ch]">
          {CLOSING.title}
        </h2>
        <p className="mt-4 text-[clamp(15px,1.3vw,22px)] leading-normal text-white/55 max-w-[52ch]">
          {CLOSING.body}
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 h-11 px-6 bg-[#1bff1b] text-black font-medium text-sm tracking-[0.04em] no-underline transition-colors duration-200 hover:bg-[#15b025]"
          >
            {CLOSING.cta}
            <span aria-hidden="true">&rarr;</span>
          </Link>
          <Link
            href="#"
            className="inline-flex items-center h-11 px-6 border border-white/20 text-white/55 text-sm tracking-[0.04em] no-underline transition-[color,border-color] duration-200 hover:text-white hover:border-white/50"
          >
            {CLOSING.secondaryCta}
          </Link>
        </div>
      </div>
    </section>
  );
}
