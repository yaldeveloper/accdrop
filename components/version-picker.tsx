"use client";

import { useState } from "react";
import Link from "next/link";
import { entryOf, etaText, guaranteeOf, optionLabel, type Product } from "@/lib/catalog";
import { productHref } from "@/lib/content";
import { fa, money } from "@/lib/format";
import { Icon } from "./brand";

/**
 * Version switcher on a product page (ChatGPT Go · Plus · Pro, Gemini Pro · Ultra, API keys…).
 * Each version is its own page, so every card is a link; the cards line up so price, duration and
 * delivery can be compared at a glance, and the chosen one opens up to show delivery time and warranty.
 */
export function VersionPicker({ product: p, variants }: { product: Product; variants: Product[] }) {
  // Mark the tapped card right away; the page for that version takes a moment to load.
  const [go, setGo] = useState<string | null>(null);
  const cur = go ?? p.id;
  // «فوری» only helps when it sets a version apart.
  const mixed = variants.some((v) => v.etaMinutes > 10);

  return (
    <fieldset className="bx-g vp">
      <legend>کدام نسخه؟ <span className="vp-n">{fa(variants.length)} نسخه</span></legend>
      <ul className="vp-list">
        {variants.map((v) => {
          const e = entryOf(v);
          const on = v.id === cur;
          const fast = v.etaMinutes <= 10;
          const monthly = Math.round(e.price / e.months / 1000) * 1000;
          return (
            <li key={v.id}>
              <Link
                href={productHref(v)}
                scroll={false}
                className={`vp-c${on ? " on" : ""}${go === v.id && v.id !== p.id ? " wait" : ""}`}
                aria-current={v.id === p.id ? "page" : undefined}
                onClick={() => setGo(v.id)}
              >
                <span className="vp-r" aria-hidden="true" />
                <span className="vp-t">
                  <b className="en">{v.tier ?? v.name}</b>
                  {v.badge ? <em className="vp-b">{v.badge}</em> : null}
                  {fast && mixed ? <em className="vp-fast">فوری</em> : null}
                </span>
                <span className="vp-p"><small>از</small> <b className="num">{money(e.price)}</b></span>
                <small className="vp-u">{v.use}</small>
                <small className="vp-d">{optionLabel(v, e.plan)}{e.months > 1 ? <>، ماهی <span className="num">{money(monthly)}</span></> : null}</small>
                {on ? (
                  <span className="vp-x">
                    <span className={fast ? "fast" : ""}><Icon id="clock" />{fast ? "تحویل فوری و خودکار" : `تحویل ${etaText(v)}`}</span>
                    <span><Icon id="shield" />{guaranteeOf(v)}</span>
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
