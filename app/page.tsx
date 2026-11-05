"use client";

import { Collection, Concierge, DropSection, Hero, Shield, Steps, useReveal } from "@/components/sections";
import { ComboSection } from "@/components/combos";

export default function Home() {
  useReveal();
  return (
    <main>
      <Hero />
      <Steps />
      <Collection />
      <ComboSection />
      <DropSection />
      <Shield />
      <Concierge />
    </main>
  );
}
