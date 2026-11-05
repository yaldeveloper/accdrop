"use client";

import { Collection, Concierge, DropSection, Hero, Shield, Steps, useReveal } from "@/components/sections";

export default function Home() {
  useReveal();
  return (
    <main>
      <Hero />
      <Collection />
      <Steps />
      <DropSection />
      <Shield />
      <Concierge />
    </main>
  );
}
