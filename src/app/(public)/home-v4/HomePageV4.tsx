"use client";

import { useRef, useEffect } from "react";
import { HeroSection } from "./HeroSection";
import { ManifestoSection } from "./ManifestoSection";
import { ThesisSection } from "./ThesisSection";
import { CoreTechSection } from "./CoreTechSection";
import { ProductModulesSection } from "./ProductModulesSection";
import { SubjectiveModelSection } from "./SubjectiveModelSection";
import { InteractionModesSection } from "./InteractionModesSection";
import { UseCasesSection } from "./UseCasesSection";
import { ClientsSection } from "./ClientsSection";
import { CTASection } from "./CTASection";
import { motion, useScroll } from "framer-motion";

const GRAIN_SVG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E")`;

/**
 * Fix CSS position:sticky for this page.
 *
 * DefaultLayout wraps all public pages with a div that has overflow-y:auto.
 * Per CSS spec, any ancestor with overflow auto/hidden/scroll creates a
 * "scroll container" — position:sticky elements anchor to the nearest one.
 * Because that wrapper grows to fit content (min-h-dvh, no max-height),
 * it never actually scrolls, so sticky never activates.
 *
 * This hook walks up the DOM and overrides overflow-y to visible on any
 * ancestor that would break sticky. Restored on unmount.
 */
function useStickyFix(ref: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const overridden: { element: HTMLElement; prev: string }[] = [];
    let parent = el.parentElement;

    while (parent && parent !== document.documentElement) {
      const { overflowY } = getComputedStyle(parent);
      if (
        overflowY === "auto" ||
        overflowY === "hidden" ||
        overflowY === "scroll"
      ) {
        overridden.push({ element: parent, prev: parent.style.overflowY });
        parent.style.overflowY = "visible";
      }
      parent = parent.parentElement;
    }

    return () => {
      overridden.forEach(({ element, prev }) => {
        element.style.overflowY = prev;
      });
    };
  }, [ref]);
}

export default function HomePageV4() {
  const rootRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll();

  useStickyFix(rootRef);

  return (
    <div
      ref={rootRef}
      className="relative min-h-screen bg-[#0a0a0c] overflow-x-clip"
    >
      {/* Scroll progress indicator */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-[2px] bg-[#2d8a4e] z-50 origin-left"
        style={{ scaleX: scrollYProgress }}
      />

      {/* Film grain overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-40 opacity-20 mix-blend-multiply"
        style={{ backgroundImage: GRAIN_SVG }}
      />

      <HeroSection />
      <ManifestoSection />
      <ThesisSection />
      <CoreTechSection />
      <ProductModulesSection />
      <SubjectiveModelSection />
      <InteractionModesSection />
      <UseCasesSection />
      <ClientsSection />
      <CTASection />
    </div>
  );
}
