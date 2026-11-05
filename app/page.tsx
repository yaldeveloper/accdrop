"use client";

import { Collection, Concierge, DropSection, Hero, Shield, Steps, useReveal } from "@/components/sections";
import { GiftPromo } from "@/components/gift";
import { ComboSection } from "@/components/combos";

export default function Home() {
  useReveal();
  return (
    <main>
      <Hero />
      <Collection />
      <ComboSection />
      <Steps />
      <DropSection />
      <GiftPromo />
      <Shield />
      <Concierge />
    </main>
  );
}
