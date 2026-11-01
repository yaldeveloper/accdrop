import type { CSSProperties } from "react";
import type { Product } from "@/lib/catalog";
import { duration, fa, money } from "@/lib/format";
import { Dots, Wordmark } from "./brand";

/** "ChatGPT Plus" -> ["ChatGPT", "Plus"] so the tool name can be set large and the tier small. */
export function splitName(name: string): [string, string] {
  const parts = name.split(" ");
  const last = parts[parts.length - 1];
  if (parts.length > 1 && ["Plus", "Pro", "AI", "Cloud"].includes(last)) return [parts.slice(0, -1).join(" "), last];
  return [name, ""];
}

/**
 * The AccDrop Access Pass: every subscription is presented as a pass to a tool.
 * It is the core visual idea of the identity (Access + Drop).
 */
export function AccessPass({ product, months, price, style, className = "" }: {
  product: Product; months: string; price?: number; style?: CSSProperties; className?: string;
}) {
  const [tool, tier] = splitName(product.name);
  return (
    <div className={`pass ${className}`} style={style}>
      <div className="pass-top">
        <Wordmark />
        <span className="en pass-k">ACCESS PASS</span>
      </div>
      <div className="pass-mid">
        <span className="en pass-maker">{product.maker}</span>
        <b className="en pass-tool">{tool}</b>
        {tier && <span className="en pass-tier">{tier}</span>}
        <p className="pass-use">{product.use}</p>
      </div>
      <div className="pass-cut" aria-hidden="true" />
      <dl className="pass-meta">
        <div><dt>مدت</dt><dd>{duration(months)}</dd></div>
        <div><dt>فعال‌سازی</dt><dd>~{fa(product.etaMinutes)} دقیقه</dd></div>
        <div><dt>{price ? "قیمت" : "گارانتی"}</dt><dd className="num">{price ? money(price) : "تا روز آخر"}</dd></div>
      </dl>
      <div className="pass-foot"><span className="en">READY TO DROP</span><Dots size={5} /></div>
    </div>
  );
}
