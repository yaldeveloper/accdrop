import type { CSSProperties } from "react";
import { axisOf, etaText, optionLabel, type Product } from "@/lib/catalog";
import { money } from "@/lib/format";
import { BrandLogo, Dots, Wordmark } from "./brand";

/** "ChatGPT Plus" -> ["ChatGPT", "Plus"] so the tool name can be set large and the tier small. */
export function splitName(name: string): [string, string] {
  const parts = name.split(" ");
  const last = parts[parts.length - 1];
  if (parts.length > 1 && ["Plus", "Pro", "AI", "Cloud", "Premium", "Stars", "ID"].includes(last)) return [parts.slice(0, -1).join(" "), last];
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
        <span className="pass-brand"><BrandLogo id={product.id} size={30} /><span className="en pass-maker">{product.maker}</span></span>
        <b className="en pass-tool">{tool}</b>
        {tier && <span className="en pass-tier">{tier}</span>}
        <p className="pass-use">{product.use}</p>
      </div>
      <div className="pass-cut" aria-hidden="true" />
      <dl className="pass-meta">
        <div><dt>{axisOf(product).replace("مدت اشتراک", "مدت")}</dt><dd>{optionLabel(product, months)}</dd></div>
        <div><dt>تحویل</dt><dd>{etaText(product)}</dd></div>
        <div><dt>{price ? "قیمت" : "گارانتی"}</dt><dd className="num">{price ? money(price) : "تا روز آخر"}</dd></div>
      </dl>
      <div className="pass-foot"><span className="en">READY TO DROP</span><Dots size={5} /></div>
    </div>
  );
}
