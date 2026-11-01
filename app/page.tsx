"use client";

import { Club, Collection, Concierge, DropSection, Figures, Footer, Header, Hero, MobileBar, Shield, Voices, useReveal } from "@/components/sections";
import { SearchDialog } from "@/components/search";
import { Sheet, Toast } from "@/components/sheet";

export default function Home() {
  useReveal();
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Figures />
        <Collection />
        <DropSection />
        <Shield />
        <Club />
        <Voices />
        <Concierge />
      </main>
      <Footer />
      <MobileBar />
      <Sheet />
      <SearchDialog />
      <Toast />
    </>
  );
}
