"use client";

import { DropSection, Hero, Shield, Steps, Support, useReveal } from "@/components/sections";

export default function Home() {
  useReveal();
  return (
    <main>
      <Hero />
      <Steps />
      <DropSection />
      <Shield />
      <Support />
    </main>
  );
}
