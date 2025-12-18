"use client";

import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import Link from "next/link";

export function CTASectionV3() {
  const t = useTranslations("CreatorPage.CTASection");

  return (
    <section className="py-32 md:py-40 bg-white dark:bg-zinc-950">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Headlines - Bold Statement (but within global max size) */}
        <div className="mb-16 max-w-4xl">
          <h2 className="font-EuclidCircularA font-bold text-3xl md:text-4xl lg:text-5xl tracking-tight leading-[0.95] mb-6 text-zinc-900 dark:text-white">
            {t("headline")}
          </h2>
          <p className="text-2xl md:text-3xl lg:text-3xl font-bold text-brand-green mb-6 leading-tight">
            {t("subheadline")}
          </p>
          <p className="text-sm md:text-base text-zinc-600 dark:text-zinc-400 max-w-2xl">
            {t("tagline")}
          </p>
        </div>

        {/* Main Title */}
        <h3 className="text-xl md:text-2xl font-bold mb-8 max-w-3xl leading-tight text-zinc-900 dark:text-white">
          {t("title")}
        </h3>

        {/* Benefits List - Simple and Clean */}
        <div className="mb-12 max-w-3xl">
          <ul className="space-y-4">
            <li className="flex items-start gap-4">
              <span className="flex-shrink-0 w-1.5 h-1.5 mt-3 bg-brand-green rounded-full" />
              <span className="text-base md:text-lg text-zinc-900 dark:text-white leading-relaxed">
                {t("benefit1")}
              </span>
            </li>
            <li className="flex items-start gap-4">
              <span className="flex-shrink-0 w-1.5 h-1.5 mt-3 bg-brand-green rounded-full" />
              <span className="text-base md:text-lg text-zinc-900 dark:text-white leading-relaxed">
                {t("benefit2")}
              </span>
            </li>
            <li className="flex items-start gap-4">
              <span className="flex-shrink-0 w-1.5 h-1.5 mt-3 bg-brand-green rounded-full" />
              <span className="text-base md:text-lg text-zinc-900 dark:text-white leading-relaxed">
                {t("benefit3")}
              </span>
            </li>
            <li className="flex items-start gap-4">
              <span className="flex-shrink-0 w-1.5 h-1.5 mt-3 bg-brand-green rounded-full" />
              <span className="text-base md:text-lg text-zinc-900 dark:text-white leading-relaxed">
                {t("benefit4")}
              </span>
            </li>
          </ul>
        </div>

        {/* Closing Statement */}
        <p className="text-sm md:text-base text-zinc-600 dark:text-zinc-400 mb-8 max-w-3xl leading-relaxed">
          {t("closing")}
        </p>

        {/* Social links row at very bottom of page */}
        <div className="mt-10 border-t border-zinc-200 dark:border-zinc-800 pt-8">
          <div className="flex flex-col items-center gap-4">
            <span className="text-xs md:text-sm text-zinc-600 dark:text-zinc-400 text-center">
              Find atypica on:
            </span>
            <div className="flex flex-wrap justify-center gap-4">
              {/* X */}
              <Link
                href="https://x.com/atypica_AI"
                target="_blank"
                rel="noreferrer"
                className={cn(
                  "w-11 h-11 rounded-md flex items-center justify-center",
                  "bg-zinc-900 text-white hover:bg-zinc-800",
                  "transition-colors",
                )}
                aria-label="Atypica on X"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 29 29"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <g clipPath="url(#creators_x_clip)">
                    <path
                      d="M19.5356 7.5H22.0727L16.531 13.8136L23.0742 22.375H17.9332L13.9271 17.1853L9.3202 22.375H6.78305L12.7253 15.6317L6.44922 7.5H11.7238L15.3626 12.26L19.5356 7.5ZM18.6342 20.8544H20.0363L10.956 8.92139H9.42035L18.6342 20.8544Z"
                      fill="currentColor"
                    ></path>
                  </g>
                  <defs>
                    <clipPath id="creators_x_clip">
                      <rect
                        width="16.625"
                        height="14.875"
                        fill="currentColor"
                        transform="translate(6.4502 7.5)"
                      ></rect>
                    </clipPath>
                  </defs>
                </svg>
              </Link>

              {/* Instagram */}
              <Link
                href="https://www.instagram.com/atypica.ai/"
                target="_blank"
                rel="noreferrer"
                className={cn(
                  "w-11 h-11 rounded-md flex items-center justify-center",
                  "bg-gradient-to-tr from-pink-500 via-red-500 to-yellow-400 text-white",
                  "transition-opacity hover:opacity-90",
                )}
                aria-label="Atypica on Instagram"
              >
                <span className="text-xs font-semibold tracking-wide">IG</span>
              </Link>

              {/* LinkedIn */}
              <Link
                href="https://www.linkedin.com/company/atypica-ai"
                target="_blank"
                rel="noreferrer"
                className={cn(
                  "w-11 h-11 rounded-md flex items-center justify-center",
                  "bg-[#0A66C2] text-white hover:bg-[#09529a]",
                  "transition-colors",
                )}
                aria-label="Atypica on LinkedIn"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 28 29"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M9.24822 11.6358V22.0444H5.78202V11.6358H9.24822ZM9.46879 8.42133C9.47585 8.93267 9.299 9.35989 8.93825 9.703C8.57749 10.0461 8.10302 10.2177 7.51483 10.2177H7.49365C6.91958 10.2177 6.45745 10.0461 6.10729 9.703C5.75712 9.35989 5.58203 8.93267 5.58203 8.42133C5.58203 7.90333 5.76241 7.47435 6.12317 7.13437C6.48392 6.7944 6.95487 6.62461 7.536 6.625C8.11713 6.62539 8.58278 6.79518 8.93295 7.13437C9.28312 7.47356 9.46174 7.90255 9.46879 8.42133ZM21.7161 16.0784V22.0444H18.2605V16.4778C18.2605 15.7425 18.1187 15.1665 17.8352 14.7497C17.5517 14.3328 17.1088 14.1244 16.5065 14.1244C16.0654 14.1244 15.696 14.2452 15.3983 14.4868C15.1007 14.7283 14.8784 15.0277 14.7313 15.3849C14.6545 15.5951 14.616 15.8786 14.616 16.2354V22.0438H11.1604C11.1745 19.2499 11.1816 16.9846 11.1816 15.2479C11.1816 13.5111 11.1781 12.4748 11.171 12.1387L11.1604 11.6346H14.616V13.1469H14.5949C14.7349 12.923 14.8784 12.7269 15.0254 12.5587C15.1725 12.3904 15.3703 12.2083 15.6189 12.0122C15.8675 11.8162 16.1722 11.6638 16.533 11.5552C16.8937 11.4466 17.2947 11.3923 17.7358 11.3923C18.9334 11.3923 19.8962 11.7897 20.6244 12.5845C21.3526 13.3794 21.7167 14.5436 21.7167 16.0772L21.7161 16.0784Z"
                    fill="currentColor"
                  ></path>
                </svg>
              </Link>

              {/* YouTube */}
              <Link
                href="https://www.youtube.com/@atypica_AI"
                target="_blank"
                rel="noreferrer"
                className={cn(
                  "w-11 h-11 rounded-md flex items-center justify-center",
                  "bg-[#FF0000] text-white hover:bg-[#cc0000]",
                  "transition-colors",
                )}
                aria-label="Atypica on YouTube"
              >
                <div className="relative w-4 h-3 rounded-[4px] border border-white/60 flex items-center justify-center">
                  <div className="w-0 h-0 border-l-[6px] border-l-white border-y-[4px] border-y-transparent translate-x-[1px]" />
                </div>
              </Link>

              {/* Discord */}
              <Link
                href="https://discord.gg/qWuh6djt"
                target="_blank"
                rel="noreferrer"
                className={cn(
                  "w-11 h-11 rounded-md flex items-center justify-center",
                  "bg-[#5662F6] text-white hover:bg-[#4650c8]",
                  "transition-colors",
                )}
                aria-label="Atypica on Discord"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 245 240"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M104.4 103.9c-5.7 0-10.2 5-10.2 11.1 0 6.1 4.6 11.1 10.2 11.1 5.7 0 10.2-5 10.2-11.1.1-6.1-4.5-11.1-10.2-11.1zm36.2 0c-5.7 0-10.2 5-10.2 11.1 0 6.1 4.6 11.1 10.2 11.1 5.7 0 10.2-5 10.2-11.1 0-6.1-4.5-11.1-10.2-11.1z"
                    fill="currentColor"
                  />
                  <path
                    d="M189.5 20h-134C38.8 20 25 33.8 25 50.6v134C25 201.2 38.8 215 55.5 215h114.1l-5.3-18.5 12.8 11.9 12.1 11.3 21.3 18.9V50.6C210.5 33.8 196.7 20 179.9 20zm-35.7 135s-3.3-4  -6-7.5c12-3.4 16.5-10.9 16.5-10.9-3.7 2.4-7.2 4.1-10.3 5.3-4.5 1.9-8.9 3.1-13.2 3.8-8.7 1.6-16.7 1.2-23.5-.1-5.2-1-9.7-2.4-13.4-3.8-2.1-.8-4.3-1.8-6.5-3- .3-.2-.6-.3-.9-.5-.2-.1-.3-.2-.4-.2-.2-.1-.3-.2-.3-.2s4.4 7.3 16.1 10.8c-2.7 3.5-6.1 7.7-6.1 7.7-20.1-.6-27.8-13.8-27.8-13.8 0-29.3 13.2-53.1 13.2-53.1 13.2-9.9 25.8-9.6 25.8-9.6l.9 1.1c-16.6 4.8-24.2 12.1-24.2 12.1s2  -1.1 5.4-2.7c9.8-4.3 17.5-5.5 20.7-5.8.5-.1.9-.2 1.4-.2 5.1-.7 10.8-.9 16.7-.2 7.8.9 16.2 3.1 24.8 7.5 0 0-7.3-7-23.1-11.9l1.3-1.5s12.6-.3 25.8 9.6c0 0 13.2 23.8 13.2 53.1 0-.1-7.8 13.1-27.9 13.7z"
                    fill="currentColor"
                  />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
