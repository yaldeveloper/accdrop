"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { DELIVERY, optionLabel, priceOf, productById, type DeliveryType, deliveryOf } from "@/lib/catalog";
import { productHref } from "@/lib/content";
import { normalizeUsername, validEmail, validUsername } from "@/lib/account";
import type { SplitView } from "@/lib/billing";
import { fa, money } from "@/lib/format";
import { api, useAccount } from "./account";
import { BrandLogo, Dots, Icon } from "./brand";
import { LoginFlow } from "./login";
import { useStore } from "./store";

function left(ms: number) {
  if (ms <= 0) return "تمام شد";
  const h = Math.floor(ms / 3_600_000), m = Math.floor((ms % 3_600_000) / 60_000);
  return h >= 1 ? `${fa(h)} ساعت و ${fa(m)} دقیقه` : `${fa(m)} دقیقه`;
}

/** The shareable «دنگ» page: who has paid, the share link, and paying your own share. */
export function Dong({ code }: { code: string }) {
  const router = useRouter();
  const q = useSearchParams();
  const { ready, user } = useAccount();
  const { notify } = useStore();
  const [v, setV] = useState<SplitView | null | undefined>(undefined);
  const [who, setWho] = useState("");
  const [bad, setBad] = useState(false);
  const [method, setMethod] = useState<"card" | "crypto">("card");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [inFlow, setInFlow] = useState(false);

  const load = useCallback(async () => {
    const r = await api<{ split: SplitView }>(`/api/splits/${code}`);
    setV(r.split ?? null);
  }, [code]);
  useEffect(() => { load(); }, [load, user?.mobile]);
  // Keep progress fresh while friends pay.
  useEffect(() => {
    const t = setInterval(() => { setNow(Date.now()); if (document.visibilityState === "visible") load(); }, 20_000);
    return () => clearInterval(t);
  }, [load]);
  useEffect(() => { if (ready && !user) setInFlow(true); }, [ready, user]);
  useEffect(() => { if (user?.email && !who && v && DELIVERY[v.type as DeliveryType]?.input === "email") setWho(user.email); }, [user?.email, v, who]);

  if (v === undefined) return <div className="wrap dg dash-wait" />;
  if (!v) return (
    <div className="wrap co-empty"><Dots size={8} /><h1>این گروه پیدا نشد</h1><p className="muted">لینک را دوباره از دوستت بگیر.</p>
      <Link className="btn btn-paper" href="/group">خرید گروهی <Icon id="arrow" className="arrow" /></Link></div>
  );

  const p = productById(v.productId);
  const type = v.type as DeliveryType;
  const single = priceOf({ id: v.productId, plan: v.plan, type }).price;
  const off = single > v.unit ? Math.round((1 - v.unit / single) * 100) : 0;
  const url = typeof location !== "undefined" ? `${location.origin}/dong/${v.code}` : `/dong/${v.code}`;
  const msg = `بیا ${p.name} رو دنگی بگیریم؛ نفری ${money(v.unit)} تومان به‌جای ${money(single)}. هر کی اشتراک جدا روی اکانت خودش:`;
  const open = v.status === "open" && !v.expired;
  const mePaid = !!v.mine && ["paid", "activating", "active"].includes(v.mine.status);
  const need = DELIVERY[type].input;
  const seatsLeft = Math.max(0, v.seats - v.paid);

  const share = async () => {
    if (navigator.share) { try { await navigator.share({ title: `دنگ ${p.name}`, text: msg, url }); return; } catch { /* closed */ } }
    copy();
  };
  const copy = async () => { try { await navigator.clipboard.writeText(url); notify("لینک کپی شد"); } catch { notify(url); } };

  const join = async () => {
    if (!user || inFlow) { notify("اول وارد حسابت شو"); return; }
    if (need === "email" && !validEmail(who)) { setBad(true); notify("ایمیل اکانت را درست وارد کن"); return; }
    if (need === "username" && !validUsername(who)) { setBad(true); notify("یوزرنیم تلگرام را درست وارد کن"); return; }
    setBusy(true);
    const r = await api<{ payUrl: string }>(`/api/splits/${v.code}/join`, { body: { email: need === "email" ? who.trim() : undefined, username: need === "username" ? normalizeUsername(who) : undefined, method } });
    if (r.payUrl) { if (r.payUrl.startsWith("/")) router.push(r.payUrl); else location.href = r.payUrl; return; }
    setBusy(false);
    notify(r.error === "full" ? "ظرفیت گروه پر شده" : r.error === "closed" ? "این گروه بسته شده" : r.error === "crypto_unavailable" ? "پرداخت با ارز دیجیتال فعلاً فعال نیست" : "پرداخت شروع نشد. دوباره امتحان کن.");
    load();
  };

  const close = async () => {
    const early = v.paid >= 2;
    if (!confirm(early ? `گروه با ${fa(v.paid)} نفر بسته شود و فعال‌سازی شروع شود؟ قیمت هر نفر همین می‌ماند.` : "گروه لغو شود؟ اگر سهمت را پرداخت کرده‌ای، پشتیبانی مبلغ را برمی‌گرداند.")) return;
    const r = await api<{ status: string }>(`/api/splits/${v.code}/close`, { body: {} });
    notify(r.status === "closed" ? "گروه بسته شد؛ فعال‌سازی شروع می‌شود" : r.status === "canceled" ? "گروه لغو شد" : "انجام نشد");
    load();
  };

  return (
    <div className="wrap dg">
      <nav className="crumbs" aria-label="مسیر"><Link href="/">اک‌دراپ</Link><span>/</span><Link href="/group">خرید گروهی</Link><span>/</span><span>دنگ <span className="en">{v.code}</span></span></nav>
      <div className="dg-g">
        <section className="dg-main">
          <div className="dg-h">
            <span className="mono"><BrandLogo id={p.id} size={30} /></span>
            <div>
              <small className="muted">{v.isOwner ? "گروه تو" : <>{v.owner} دعوتت کرده</>}</small>
              <h1>دنگ <Link href={productHref(p)} className="en">{p.name}</Link></h1>
              <small className="muted">{optionLabel(p, v.plan)} • {deliveryOf(p, type).title} • گروه {fa(v.seats)} نفره</small>
            </div>
          </div>

          <div className="dg-price">
            <span>سهم هر نفر</span>
            <b className="num">{money(v.unit)}</b><small>تومان</small>
            {off > 0 && <><s className="num">{money(single)}</s><i>{fa(off)}٪ کمتر</i></>}
          </div>

          <ol className="dg-seats" aria-label={`${fa(v.paid)} از ${fa(v.seats)} نفر پرداخت کرده‌اند`}>
            {Array.from({ length: Math.max(v.seats, v.members.filter((m) => m.paid).length) }, (_, i) => {
              const m = v.members.filter((x) => x.paid)[i];
              return (
                <li key={i} className={m ? "paid" : ""}>
                  <span className="dg-av">{m ? m.name.trim()[0] : <Icon id="user" />}</span>
                  <small>{m ? <>{m.me ? "خودت" : m.name}{m.owner ? " • سازنده" : ""}</> : "جای خالی"}</small>
                </li>
              );
            })}
          </ol>
          <div className="dg-bar"><i style={{ width: `${Math.min(100, (v.paid / v.seats) * 100)}%` }} /></div>
          <p className="dg-st">
            {v.status === "full" ? <><Icon id="check" /> گروه کامل شد؛ اشتراک همه در حال فعال‌سازی است.</>
              : v.status === "closed" ? <><Icon id="check" /> گروه با {fa(v.paid)} نفر بسته شد و فعال‌سازی شروع شده.</>
              : v.status === "canceled" ? "این گروه لغو شده."
              : v.expired ? "مهلت این گروه تمام شده."
              : <><b className="num">{fa(v.paid)}</b> از <b className="num">{fa(v.seats)}</b> نفر پرداخت کرده‌اند • {fa(seatsLeft)} جای خالی • <Icon id="clock" /> {left(v.expiresAt - now)} مانده</>}
          </p>

          {open && (v.isOwner || mePaid) && (
            <div className={`dg-share ${q.get("new") ? "new" : ""}`}>
              <b>{q.get("new") && v.isOwner ? "گروهت ساخته شد! لینک را برای دوستانت بفرست" : "لینک گروه را بفرست"}</b>
              <div className="dg-link"><input readOnly value={url} className="ltr" onFocus={(e) => e.target.select()} aria-label="لینک گروه" /><button type="button" onClick={copy}>کپی</button></div>
              <div className="dg-apps">
                <a className="tg" href={`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(msg)}`} target="_blank" rel="noreferrer">تلگرام</a>
                <a className="wa" href={`https://wa.me/?text=${encodeURIComponent(`${msg}\n${url}`)}`} target="_blank" rel="noreferrer">واتساپ</a>
                <a href={`https://eitaa.com/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(msg)}`} target="_blank" rel="noreferrer">ایتا</a>
                <button type="button" onClick={share}>بیشتر…</button>
              </div>
            </div>
          )}
        </section>

        <aside className="dg-side">
          {mePaid ? (
            <div className="dg-card ok">
              <b><Icon id="check" /> سهمت پرداخت شد</b>
              <p className="muted">{v.status === "full" || v.status === "closed" ? "فعال‌سازی شروع شده و وقتی آماده شد پیامک می‌گیری." : "به‌محض اینکه بقیه هم پرداخت کنند، اشتراکت فعال می‌شود و پیامک می‌گیری."}</p>
              <Link className="btn btn-ghost btn-block" href={`/orders/${v.mine!.code}`}>دیدن سفارش</Link>
            </div>
          ) : open && seatsLeft > 0 ? (
            <div className="dg-card">
              <b>{v.isOwner ? "سهم خودت را پرداخت کن" : "به گروه بپیوند"}</b>
              {!ready ? null : !user || inFlow ? (
                <LoginFlow compact onDone={() => { setInFlow(false); load(); }} />
              ) : (
                <>
                  {need && (
                    <div className="fld">
                      <label htmlFor="dg-who">{need === "email" ? <>ایمیل اکانت <span className="en">{p.maker}</span> تو</> : "یوزرنیم تلگرام گیرنده"}</label>
                      <input id="dg-who" className={`ltr ${bad ? "bad" : ""}`} type={need === "email" ? "email" : "text"} placeholder={need === "email" ? "you@gmail.com" : "@username"}
                        value={who} onChange={(e) => { setWho(e.target.value); setBad(false); }} />
                      <small className="muted">اشتراک جدا روی اکانت خودت؛ هیچ‌وقت رمز نمی‌خواهیم.</small>
                    </div>
                  )}
                  <div className="dg-m" role="radiogroup" aria-label="روش پرداخت">
                    <button type="button" role="radio" aria-checked={method === "card"} className={method === "card" ? "on" : ""} onClick={() => setMethod("card")}>درگاه بانکی</button>
                    <button type="button" role="radio" aria-checked={method === "crypto"} className={method === "crypto" ? "on" : ""} onClick={() => setMethod("crypto")}>ارز دیجیتال</button>
                  </div>
                  <button className="btn btn-paper btn-block" onClick={join} disabled={busy}>{busy ? "در حال اتصال…" : <>پرداخت سهم من • <span className="num">{money(v.unit)}</span> تومان</>}</button>
                </>
              )}
            </div>
          ) : (
            <div className="dg-card"><b>{v.status === "full" ? "ظرفیت گروه پر شد" : "این گروه دیگر عضو نمی‌گیرد"}</b><p className="muted">خودت یک گروه تازه بساز.</p>
              <Link className="btn btn-paper btn-block" href={`${productHref(p)}?seats=${v.seats}&dong=1#buy`}>ساخت گروه جدید</Link></div>
          )}

          {v.isOwner && v.status === "open" && (
            <div className="dg-card dg-own">
              <b>مدیریت گروه</b>
              <p className="muted">{v.paid >= 2 ? `اگر منتظر بقیه نمی‌مانی، گروه را با ${fa(v.paid)} نفر ببند تا فعال‌سازی شروع شود.` : "اگر منصرف شدی، گروه را لغو کن."}</p>
              <button className="btn btn-ghost btn-block" onClick={close}>{v.paid >= 2 ? `بستن گروه با ${fa(v.paid)} نفر` : "لغو گروه"}</button>
            </div>
          )}

          <ul className="dg-how">
            <li><Icon id="shield" />هر نفر اشتراک جدا روی اکانت خودش؛ هیچ اکانتی اشتراکی نیست.</li>
            <li><Icon id="lock" />قیمت تا پایان مهلت گروه قفل است، حتی اگر دلار بالا برود.</li>
            <li><Icon id="clock" />اگر گروه کامل نشد، سازنده می‌تواند با کسانی که پرداخت کرده‌اند گروه را ببندد؛ در غیر این صورت پولت برمی‌گردد.</li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
