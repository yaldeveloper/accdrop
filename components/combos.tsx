"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { optionLabel, productById } from "@/lib/catalog";
import { COMBOS, comboAvailable, comboPrice, type Combo } from "@/lib/combos";
import { fa, money } from "@/lib/format";
import { BrandLogo, Eyebrow, Icon } from "./brand";
import { useStore } from "./store";

/** Packs that can be bought right now (every item in stock). */
export const liveCombos = () => COMBOS.filter(comboAvailable);

export function ComboCard({ c }: { c: Combo }) {
  const { addCombo, notify } = useStore();
  const router = useRouter();
  const { full, price, save, off } = comboPrice(c);
  const buy = () => {
    if (!addCombo(c.id)) notify("این پک از قبل در سبد هست");
    router.push("/checkout");
  };
  return (
    <article className="cb-card" id={`pack-${c.id}`}>
      <div className="cb-stack" aria-hidden>
        {c.items.map((it) => <span key={it.id} className="mono"><BrandLogo id={it.id} size={22} /></span>)}
      </div>
      {c.badge && <span className="cb-badge">{c.badge}</span>}
      <h3>{c.name}</h3>
      <p className="cb-for">{c.tagline}</p>
      <ul className="cb-items">
        {c.items.map((it) => {
          const p = productById(it.id);
          return (
            <li key={it.id}>
              <b className="en">{p.name}</b>
              <small>{optionLabel(p, it.plan)}</small>
            </li>
          );
        })}
      </ul>
      <p className="cb-pitch">{c.pitch}</p>
      <div className="cb-price">
        {off > 0 && <s className="num">{money(full)}</s>}
        <span><b className="num">{money(price)}</b> تومان</span>
        {off > 0 && <small className="cb-save">{fa(off)}٪ ارزان‌تر؛ {money(save)} تومان کمتر از خرید جدا</small>}
      </div>
      <button type="button" className="btn btn-paper btn-block cb-btn" onClick={buy}>خرید پک <Icon id="arrow" className="arrow" /></button>
      <small className="cb-note">هر سرویس جدا و خودکار تحویل می‌شود، با گارانتی خودش.</small>
    </article>
  );
}

/** Home page section: the packs, under a short promise. */
export function ComboSection() {
  const packs = liveCombos();
  if (!packs.length) return null;
  return (
    <section className="cb" id="packs">
      <div className="wrap">
        <div className="head reveal">
          <div>
            <Eyebrow>کمبو پک</Eyebrow>
            <h2>با هم بخر،<br /><b>کمتر بپرداز.</b></h2>
          </div>
          <p className="muted">ابزارهایی که کنار هم کار می‌کنند، در یک پک و تا {fa(Math.max(...packs.map((c) => comboPrice(c).off)))}٪ ارزان‌تر. یک پرداخت، تحویل خودکار هر کدام.</p>
        </div>
        <div className="cb-grid">{packs.slice(0, 3).map((c) => <ComboCard key={c.id} c={c} />)}</div>
        {packs.length > 3 && <div className="cb-more"><Link href="/packs" className="link">همه پک‌ها ({fa(packs.length)})</Link></div>}
      </div>
    </section>
  );
}

/** Every pack (the /packs page). */
export function ComboGrid() {
  const packs = liveCombos();
  if (!packs.length) return <p className="muted">فعلاً پکی موجود نیست؛ کمی بعد سر بزن.</p>;
  return <div className="cb-grid">{packs.map((c) => <ComboCard key={c.id} c={c} />)}</div>;
}
