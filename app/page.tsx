"use client";

import { Club, Collection, Concierge, DropSection, Footer, Header, Hero, MobileBar, Shield, Steps, useReveal } from "@/components/sections";
import { SearchDialog } from "@/components/search";
import { Sheet, Toast } from "@/components/sheet";

export default function Home() {
  useReveal();
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Steps />
        <Collection />
        <DropSection />
        <Shield />
        <Club />
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
