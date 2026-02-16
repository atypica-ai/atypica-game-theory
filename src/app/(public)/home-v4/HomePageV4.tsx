"use client";

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

const GRAIN_SVG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`;

export default function HomePageV4() {
  return (
    <div className="relative min-h-screen bg-[#0a0a0c] text-white overflow-hidden">
      {/* Film grain overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-50 opacity-30"
        style={{ backgroundImage: GRAIN_SVG }}
      />

      {/* 1. Hero — cinematic entry, giant type */}
      <HeroSection />
      {/* 2. Manifesto — single statement, breathing room */}
      <ManifestoSection />
      {/* 3. Thesis — two agent roles (simulator + researcher) */}
      <ThesisSection />
      {/* 4. Core Tech — orbit diagram, visual highlight */}
      <CoreTechSection />
      {/* 5. Product Modules — four modes grid */}
      <ProductModulesSection />
      {/* 6. Subjective Model — three pillars (Persona/Sage/Panel) */}
      <SubjectiveModelSection />
      {/* 7. Interaction Modes — methods + modalities */}
      <InteractionModesSection />
      {/* 8. Use Cases — 9 numbered cards */}
      <UseCasesSection />
      {/* 9. Clients — social proof strip */}
      <ClientsSection />
      {/* 10. CTA — final statement */}
      <CTASection />
    </div>
  );
}
