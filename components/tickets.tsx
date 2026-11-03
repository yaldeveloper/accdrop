"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TICKET_MAX_BODY, TICKET_STATUS, TOPICS, type Ticket, type TicketTopic } from "@/lib/tickets";
import { fa, faDate } from "@/lib/format";
import { api, useAccount } from "./account";
import { Icon } from "./brand";
import { useStore } from "./store";

export function TicketChip({ t }: { t: Ticket }) {
  const cls = t.status === "open" ? "s1" : t.status === "answered" ? "s2" : "sx";
  return <span className={`chip ${cls}`}><i />{TICKET_STATUS[t.status]}</span>;
}

/** Relative time for the last week, an absolute date after that. */
const when = (t: number) => {
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return "همین الان";
  if (m < 60) return `${fa(m)} دقیقه پیش`;
  if (m < 1440) return `${fa(Math.round(m / 60))} ساعت پیش`;
  if (m < 10080) return `${fa(Math.round(m / 1440))} روز پیش`;
  return faDate(t, false);
};

export function TicketRows({ tickets, base }: { tickets: Ticket[]; base: string }) {
  return (
    <div className="tk-list">
      {tickets.map((t) => (
        <Link key={t.id} href={`${base}/${t.id}`} className={`tk-row ${t.status}`}>
          <span className="tk-n num">#{fa(t.id)}</span>
          <span className="tk-t"><b>{t.subject}</b><small className="muted">{TOPICS[t.topic]}{t.orderCode ? ` • ${t.orderCode}` : ""}{t.name !== undefined && base.startsWith("/admin") ? ` • ${t.name || fa(t.mobile)}` : ""}</small>
            {t.last && <small className="tk-last">{t.last}</small>}</span>
          <span className="tk-d muted">{when(t.updatedAt)}</span>
          <TicketChip t={t} />
          <Icon id="arrow" className="arrow" />
        </Link>
      ))}
    </div>
  );
}

export function MyTickets() {
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  useEffect(() => { api<{ tickets: Ticket[] }>("/api/tickets").then((r) => setTickets(r.tickets ?? [])); }, []);
  return (
    <>
      <header className="dash-h tk-h"><div><h1>تیکت‌ها</h1><p className="muted">سؤال یا مشکلی داری؟ اینجا بنویس؛ معمولاً تا یک ساعت جواب می‌دهیم.</p></div>
        <Link className="btn btn-paper" href="/account/tickets/new">تیکت جدید</Link></header>
      {!tickets ? <div className="dash-wait" /> : tickets.length ? <TicketRows tickets={tickets} base="/account/tickets" /> : (
        <div className="dash-empty"><b>هنوز تیکتی نداری</b><p className="muted">هر وقت سؤالی داشتی، یک تیکت باز کن. جواب را همین‌جا و با پیامک می‌گیری.</p></div>
      )}
    </>
  );
}

export function NewTicket({ topic: t0, q, order }: { topic?: string; q?: string; order?: string }) {
  const router = useRouter();
  const { orders } = useAccount();
  const { notify } = useStore();
  const [topic, setTopic] = useState<TicketTopic>(t0 && t0 in TOPICS ? (t0 as TicketTopic) : "order");
  const [orderCode, setOrderCode] = useState(order ?? "");
  const [subject, setSubject] = useState(t0 === "request" && q ? `درخواست ${q}` : "");
  const [body, setBody] = useState(t0 === "request" && q ? `سلام، لطفاً ${q} را هم به فروشگاه اضافه کنید.` : "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const needsOrder = topic === "order" || topic === "activation" || topic === "payment";

  const send = async () => {
    if (body.trim().length < 5) { setErr("پیامت را کمی کامل‌تر بنویس."); return; }
    setBusy(true);
    const r = await api<{ id: number }>("/api/tickets", { body: { topic, subject, body, orderCode: needsOrder ? orderCode : "" } });
    setBusy(false);
    if (r.id) { notify("تیکت ثبت شد"); router.push(`/account/tickets/${r.id}`); return; }
    setErr(r.error === "too_many" ? "۵ تیکت باز داری. لطفاً منتظر جواب آن‌ها بمان یا یکی را ببند." : "ثبت نشد. دوباره امتحان کن.");
  };

  return (
    <>
      <nav className="crumbs" aria-label="مسیر"><Link href="/account/tickets">تیکت‌ها</Link><span>/</span><span>تیکت جدید</span></nav>
      <header className="dash-h"><h1>تیکت جدید</h1><p className="muted">هرچه دقیق‌تر بنویسی، سریع‌تر حل می‌شود.</p></header>
      <form className="dash-sec tk-form" noValidate onSubmit={(e) => { e.preventDefault(); send(); }}>
        <div className="fld"><span className="lbl">موضوع</span>
          <div className="tk-topics" role="radiogroup">
            {(Object.keys(TOPICS) as TicketTopic[]).map((k) => (
              <button key={k} type="button" role="radio" aria-checked={topic === k} className={topic === k ? "on" : ""} onClick={() => setTopic(k)}>{TOPICS[k]}</button>
            ))}
          </div>
        </div>
        {needsOrder && (
          <div className="fld"><label htmlFor="tk-o">کدام سفارش؟</label>
            <select id="tk-o" value={orderCode} onChange={(e) => setOrderCode(e.target.value)}>
              <option value="">مربوط به سفارش خاصی نیست</option>
              {orders.map((o) => <option key={o.code} value={o.code}>{o.code} • {faDate(o.createdAt, false)}</option>)}
            </select></div>
        )}
        <div className="fld"><label htmlFor="tk-s">عنوان (اختیاری)</label>
          <input id="tk-s" value={subject} maxLength={120} onChange={(e) => setSubject(e.target.value)} placeholder={TOPICS[topic]} /></div>
        <div className="fld"><label htmlFor="tk-b">پیام</label>
          <textarea id="tk-b" rows={6} value={body} maxLength={TICKET_MAX_BODY} onChange={(e) => { setBody(e.target.value); setErr(""); }}
            placeholder="مشکل یا سؤالت را بنویس. هیچ‌وقت رمز عبور اکانتت را اینجا ننویس." className={err ? "bad" : ""} />
          {err ? <small className="err">{err}</small> : <small className="muted">فقط ایمیل یا آیدی؛ رمز عبور هیچ‌وقت لازم نیست.</small>}
        </div>
        <button className="btn btn-paper" disabled={busy}>{busy ? "در حال ارسال…" : "ارسال تیکت"}</button>
      </form>
    </>
  );
}

/** One conversation. `admin` switches the API, the labels and the status controls. */
export function TicketThread({ id, admin = false }: { id: number; admin?: boolean }) {
  const { notify } = useStore();
  const base = admin ? `/api/admin/tickets/${id}` : `/api/tickets/${id}`;
  const [t, setT] = useState<Ticket | null>(null);
  const [missing, setMissing] = useState(false);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const load = useCallback(async () => {
    const r = await api<{ ticket: Ticket }>(base);
    if (r.ticket) setT(r.ticket); else setMissing(true);
  }, [base]);
  useEffect(() => { load(); const i = setInterval(load, 20000); return () => clearInterval(i); }, [load]);

  const send = async () => {
    if (reply.trim().length < 2) return;
    setBusy(true);
    const r = await api<{ ticket: Ticket }>(base, { body: { body: reply } });
    setBusy(false);
    if (r.ticket) { setT(r.ticket); setReply(""); setTimeout(() => end.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 30); }
    else notify("ارسال نشد");
  };
  const setStatus = async (status: "open" | "closed") => {
    const r = await api<{ ticket: Ticket }>(base, { method: "PATCH", body: { status } });
    if (r.ticket) { setT(r.ticket); notify(status === "closed" ? "تیکت بسته شد" : "تیکت باز شد"); }
  };

  if (missing) return <div className="dash-empty"><b>تیکت پیدا نشد</b></div>;
  if (!t) return <div className="dash-wait" />;
  const back = admin ? "/admin/tickets" : "/account/tickets";
  return (
    <>
      <nav className="crumbs" aria-label="مسیر"><Link href={back}>تیکت‌ها</Link><span>/</span><span className="num">#{fa(t.id)}</span></nav>
      <header className="dash-h tk-h">
        <div><h1>{t.subject}</h1>
          <p className="muted">{TOPICS[t.topic]} • باز شده {faDate(t.createdAt)}{admin ? <> • <span className="num">{fa(t.mobile)}</span>{t.name ? ` (${t.name})` : ""}</> : null}
            {t.orderCode && <> • <Link className="link en" href={admin ? `/admin/orders/${t.orderCode}` : `/orders/${t.orderCode}`}>{t.orderCode}</Link></>}</p></div>
        <TicketChip t={t} />
      </header>
      <div className="tk-thread">
        {t.messages?.map((m) => {
          const mine = admin ? m.author === "admin" : m.author === "user";
          return (
            <div key={m.id} className={`tk-msg ${mine ? "me" : "them"} ${m.author}`}>
              <small>{m.author === "admin" ? "پشتیبانی اک‌دراپ" : admin ? (t.name || "مشتری") : "تو"} • {when(m.createdAt)}</small>
              <p>{m.body}</p>
            </div>
          );
        })}
        <div ref={end} />
      </div>
      {t.status === "closed" && !admin ? (
        <div className="tk-closed muted">این تیکت بسته شده. <button className="link" onClick={() => setStatus("open")}>باز کردن دوباره</button></div>
      ) : (
        <form className="tk-reply" onSubmit={(e) => { e.preventDefault(); send(); }}>
          <textarea rows={3} value={reply} maxLength={TICKET_MAX_BODY} onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) send(); }}
            placeholder={admin ? "پاسخ به مشتری…" : "پیام تازه…"} aria-label="پیام" />
          <div className="adm-actions">
            <button className="btn btn-paper" disabled={busy || reply.trim().length < 2}>{busy ? "در حال ارسال…" : admin ? "ارسال پاسخ" : "ارسال"}</button>
            {t.status !== "closed" && <button type="button" className="btn btn-ghost" onClick={() => setStatus("closed")}>{admin ? "بستن تیکت" : "مشکلم حل شد"}</button>}
            {admin && t.status === "closed" && <button type="button" className="btn btn-ghost" onClick={() => setStatus("open")}>باز کردن دوباره</button>}
          </div>
          {admin && <small className="muted">با ارسال پاسخ، به مشتری پیامک می‌رود.</small>}
        </form>
      )}
    </>
  );
}

export function AdminTickets() {
  const [status, setStatus] = useState("open");
  const [q, setQ] = useState(""), [term, setTerm] = useState("");
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  useEffect(() => {
    setTickets(null);
    api<{ tickets: Ticket[] }>(`/api/admin/tickets?status=${status}&q=${encodeURIComponent(term)}`).then((r) => setTickets(r.tickets ?? []));
  }, [status, term]);
  const F: [string, string][] = [["open", "در انتظار پاسخ"], ["answered", "پاسخ داده شده"], ["closed", "بسته"], ["", "همه"]];
  return (
    <>
      <header className="dash-h"><h1>تیکت‌ها</h1><p className="muted">تیکت‌های در انتظار پاسخ اول نمایش داده می‌شوند.</p></header>
      <div className="adm-bar">
        <div className="chips">{F.map(([k, l]) => <button key={k} className={status === k ? "on" : ""} onClick={() => setStatus(k)}>{l}</button>)}</div>
        <form onSubmit={(e) => { e.preventDefault(); setTerm(q); }}><input className="adm-in" placeholder="شماره تیکت، موبایل یا کد سفارش" value={q} onChange={(e) => setQ(e.target.value)} /></form>
      </div>
      {!tickets ? <p className="muted">…</p> : tickets.length ? <TicketRows tickets={tickets} base="/admin/tickets" /> : <p className="muted">تیکتی نیست.</p>}
    </>
  );
}
