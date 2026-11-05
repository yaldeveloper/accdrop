"use client";

import { Collection, Concierge, DropSection, Hero, Shield, Steps, useReveal } from "@/components/sections";
import { GiftPromo } from "@/components/gift";

export default function Home() {
  useReveal();
  return (
    <main>
      <Hero />
      <Collection />
      <Steps />
      <DropSection />
      <GiftPromo />
      <Shield />
      <Concierge />
    </main>
  );
}
