"use client";

import type { ReactNode } from "react";
import { applyCatalog, type CatalogPatch, type SupplyState } from "@/lib/catalog-sync";

/** Applies admin product edits and the supplier sync in the browser before any child reads the catalog. */
export function CatalogBoot({ data, rate, supply, children }: { data: CatalogPatch[]; rate: number; supply: SupplyState; children: ReactNode }) {
  applyCatalog(data, rate, supply);
  return <>{children}</>;
}
