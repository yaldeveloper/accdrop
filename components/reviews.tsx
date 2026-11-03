"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { productById } from "@/lib/catalog";
import { fa, faDate } from "@/lib/format";
import { api, useAccount } from "./account";
import { BrandLogo, Icon } from "./brand";
import { useStore } from "./store";

type Review = { id: number; productId: string; name: string; rating: number; body: string; verified: boolean; reply: string; at: number; status: string; mobile?: string };
type Data = { reviews: Review[]; count: number; avg: number; dist: Record<number, number>; mine: Review | null };

export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span className="stars" style={{ "--s": `${size}px`, "--v": `${(value / 5) * 100}%` } as React.CSSProperties} aria-label={`${fa(value)} از ۵`} role="img">
      <span>★★★★★</span><span aria-hidden="true">★★★★★</span>
    </span>
  );
}

/** Reviews section on a product page: summary, list, and a form for signed-in customers. */
export function Reviews({ productId, name }: { productId: string; name: string }) {
  const { user } = useAccount();
  const { notify } = useStore();
  const path = usePathname();
  const [d, setD] = useState<Data | null>(null);
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => { const r = await api<Data>(`/api/reviews?p=${productId}`); if (r.reviews) setD(r); }, [productId]);
  useEffect(() => { load(); }, [load, user?.mobile]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim().length < 5) { notify("چند کلمه درباره تجربه‌ات بنویس"); return; }
    setBusy(true);
    const r = await api("/api/reviews", { body: { product: productId, rating, body: text } });
    setBusy(false);
    if (r.error) { notify("ثبت نشد؛ دوباره امتحان کن"); return; }
    setSent(true); setText(""); load();
  };

  const count = d?.count ?? 0;
  return (
    <section className="p2-sec rv" id="reviews">
      <div className="wrap">
        <span className="p2-k">نظرات</span>
        <h2>تجربه خریدارهای {name}</h2>
        <div className="rv-g">
          <aside className="rv-sum">
            {count ? (
              <>
                <b className="num rv-avg">{fa(d!.avg)}</b>
                <Stars value={d!.avg} size={20} />
                <small className="muted">از <span className="num">{fa(count)}</span> نظر</small>
                <ul className="rv-dist">{[5, 4, 3, 2, 1].map((n) => (
                  <li key={n}><span className="num">{fa(n)}</span><i><b style={{ width: `${((d!.dist[n] ?? 0) / count) * 100}%` }} /></i><span className="num">{fa(d!.dist[n] ?? 0)}</span></li>
                ))}</ul>
              </>
            ) : <p className="muted">{d ? "هنوز نظری ثبت نشده. اولین نفر باش." : "…"}</p>}

            {user ? (
              d?.mine && !sent ? (
                <p className="rv-mine">نظر تو {d.mine.status === "approved" ? "منتشر شده" : "در انتظار تأیید است"}. می‌توانی ویرایشش کنی.</p>
              ) : null
            ) : (
              <Link className="btn btn-ink btn-block" href={`/login?next=${encodeURIComponent(path + "#reviews")}`}>برای ثبت نظر وارد شو</Link>
            )}
            {user && (sent ? (
              <p className="rv-ok"><Icon id="check" />ممنون! نظرت بعد از بررسی منتشر می‌شود.</p>
            ) : (
              <form className="rv-form" onSubmit={submit}>
                <div className="rv-rate" role="radiogroup" aria-label="امتیاز" onMouseLeave={() => setHover(0)}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${fa(n)} ستاره`}
                      className={(hover || rating) >= n ? "on" : ""} onMouseEnter={() => setHover(n)} onClick={() => setRating(n)}>★</button>
                  ))}
                </div>
                <textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="تجربه‌ات از خرید و استفاده را بنویس…" maxLength={1200} aria-label="متن نظر" />
                <button className="btn btn-ink btn-block" disabled={busy}>{busy ? "…" : d?.mine ? "ویرایش نظر" : "ثبت نظر"}</button>
              </form>
            ))}
          </aside>
          <ol className="rv-list">
            {d?.reviews.map((r) => (
              <li key={r.id}>
                <div className="rv-h">
                  <span className="rv-av">{r.name.trim()[0] ?? "ک"}</span>
                  <div><b>{r.name}</b><small className="muted">{faDate(r.at, false)}{r.productId !== productId ? <> • <span className="en">{productById(r.productId)?.tier ?? productById(r.productId)?.name}</span></> : null}</small></div>
                  <Stars value={r.rating} />
                </div>
                {r.verified && <span className="rv-v"><Icon id="check" />خریدار تأییدشده</span>}
                <p>{r.body}</p>
                {r.reply && <div className="rv-reply"><b>پاسخ اک‌دراپ</b><p>{r.reply}</p></div>}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

// ----- Admin moderation -----
export function AdminReviews() {
  const { notify } = useStore();
  const [status, setStatus] = useState("pending");
  const [list, setList] = useState<Review[] | null>(null);
  const [replies, setReplies] = useState<Record<number, string>>({});
  const load = useCallback(async () => { const r = await api<{ reviews: Review[] }>(`/api/admin/reviews?status=${status}`); if (r.reviews) setList(r.reviews); }, [status]);
  useEffect(() => { load(); }, [load]);
  const act = async (id: number, patch: object, msg: string) => { await api("/api/admin/reviews", { body: { id, ...patch } }); notify(msg); load(); };
  const T: Record<string, string> = { pending: "در انتظار", approved: "منتشرشده", rejected: "ردشده", all: "همه" };
  return (
    <>
      <header className="dash-h"><h1>نظرات</h1><p className="muted">نظرها بعد از تأیید روی صفحه محصول نمایش داده می‌شوند.</p></header>
      <div className="ap-cats" style={{ marginBottom: 18 }}>{Object.keys(T).map((k) => <button key={k} className={status === k ? "on" : ""} onClick={() => setStatus(k)}>{T[k]}</button>)}</div>
      {!list ? <p className="muted">…</p> : !list.length ? <p className="muted">موردی نیست.</p> : (
        <div className="adm-cards">{list.map((r) => {
          const p = productById(r.productId);
          return (
            <div key={r.id} className="dash-sec adm-card">
              <div className="adm-lh"><span className="mono"><BrandLogo id={r.productId} size={16} /></span><b className="en">{p?.name ?? r.productId}</b><Stars value={r.rating} size={13} /></div>
              <small className="muted">{r.name} • <span className="num">{fa(r.mobile ?? "")}</span> • {faDate(r.at, false)}{r.verified ? " • خریدار" : ""} • {T[r.status]}</small>
              <p>{r.body}</p>
              <textarea className="adm-in" rows={2} placeholder="پاسخ عمومی (اختیاری)" defaultValue={r.reply} onChange={(e) => setReplies({ ...replies, [r.id]: e.target.value })} style={{ height: "auto", padding: 10 }} />
              <div className="adm-actions">
                {r.status !== "approved" && <button className="btn btn-paper" onClick={() => act(r.id, { status: "approved", reply: replies[r.id] }, "منتشر شد")}>تأیید و انتشار</button>}
                {r.status !== "rejected" && <button className="btn btn-ghost" onClick={() => act(r.id, { status: "rejected" }, "رد شد")}>رد</button>}
                {replies[r.id] !== undefined && r.status === "approved" && <button className="link" onClick={() => act(r.id, { reply: replies[r.id] }, "پاسخ ذخیره شد")}>ذخیره پاسخ</button>}
              </div>
            </div>
          );
        })}</div>
      )}
    </>
  );
}
