"use client";

import { Collection, Concierge, DropSection, Hero, Shield, Steps, useReveal } from "@/components/sections";

export default function Home() {
  useReveal();
  return (
    <main>
      <Hero />
      <Steps />
      <Collection />
      <DropSection />
      <Shield />
      <Concierge />
    </main>
  );
}
