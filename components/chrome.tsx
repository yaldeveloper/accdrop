"use client";

import type { ReactNode } from "react";
import { Footer, Header, MobileBar } from "./sections";
import { SearchDialog } from "./search";
import { Sheet, Toast } from "./sheet";

/** Site-wide shell shared by every page: header, footer, cart/checkout sheet, search and toasts. */
export function SiteChrome({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      {children}
      <Footer />
      <MobileBar />
      <Sheet />
      <SearchDialog />
      <Toast />
    </>
  );
}
