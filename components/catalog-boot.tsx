"use client";

import type { ReactNode } from "react";
import { applyCatalog, type CatalogPatch } from "@/lib/catalog-sync";

/** Applies admin product edits in the browser before any child reads the catalog. */
export function CatalogBoot({ data, rate, children }: { data: CatalogPatch[]; rate: number; children: ReactNode }) {
  applyCatalog(data, rate);
  return <>{children}</>;
}
