"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fa, faDate } from "@/lib/format";
import { api } from "./account";
import { Icon } from "./brand";
import type { ChatMsg } from "./chat";

type ChatRow = { id: number; name: string; mobile: string | null; page: string; status: "open" | "closed"; unread: number; updatedAt: number; last: string };
type Thread = { status: "open" | "closed"; mobile: string | null; page: string; messages: ChatMsg[] };

const ago = (t: number) => {
  const m = Math.round((Date.now() - t) / 60000);
  return m < 1 ? "همین الان" : m < 60 ? `${fa(m)} دقیقه پیش` : m < 1440 ? `${fa(Math.round(m / 60))} ساعت پیش` : faDate(t, false);
};
const SAVED = ["سلام، وقت بخیر. چطور کمکت کنم؟", "سفارشت در صف فعال‌سازی است و تا چند دقیقه دیگر انجام می‌شود.", "لطفاً کد سفارشت را بفرست تا بررسی کنم.", "برای این کار، از صفحه سرویس‌ها گزینه مناسب را انتخاب کن؛ لینکش را می‌فرستم."];

export function AdminChat() {
  const [chats, setChats] = useState<ChatRow[] | null>(null);
  const [sel, setSel] = useState<number | null>(null);
  const [t, setT] = useState<Thread | null>(null);
  const [text, setText] = useState("");
  const last = useRef(0);
  const list = useRef<HTMLDivElement>(null);

  const loadList = useCallback(async () => { const r = await api<{ chats: ChatRow[] }>("/api/admin/chat"); if (r.chats) setChats(r.chats); }, []);
  const loadThread = useCallback(async (id: number, reset = false) => {
    if (reset) last.current = 0;
    const r = await api<Thread>(`/api/admin/chat/${id}?after=${last.current}`);
    if (!r.messages) return;
    if (r.messages.length) last.current = r.messages[r.messages.length - 1].id;
    setT((prev) => (reset || !prev ? r : { ...r, messages: [...prev.messages, ...r.messages.filter((m) => !prev.messages.some((x) => x.id === m.id))] }));
  }, []);

  useEffect(() => { loadList(); const i = setInterval(() => { if (!document.hidden) loadList(); }, 8000); return () => clearInterval(i); }, [loadList]);
  useEffect(() => {
    if (sel === null) return;
    loadThread(sel, true);
    const i = setInterval(() => { if (!document.hidden) loadThread(sel); }, 4000);
    return () => clearInterval(i);
  }, [sel, loadThread]);
  useEffect(() => { list.current?.scrollTo({ top: list.current.scrollHeight }); }, [t?.messages.length]);

  const reply = async (body: string) => {
    if (!sel || !body.trim()) return;
    const r = await api<{ message: ChatMsg }>(`/api/admin/chat/${sel}`, { body: { body } });
    if (r.message) { setText(""); last.current = Math.max(last.current, r.message.id); setT((p) => (p ? { ...p, messages: [...p.messages, r.message] } : p)); loadList(); }
  };
  const setStatus = async (status: "open" | "closed") => {
    if (!sel) return;
    await api(`/api/admin/chat/${sel}`, { body: { status } });
    setT((p) => (p ? { ...p, status } : p)); loadList();
  };
  const cur = chats?.find((c) => c.id === sel);

  return (
    <>
      <header className="dash-h"><h1>چت آنلاین</h1><p className="muted">{chats ? `${fa(chats.filter((c) => c.status === "open").length)} گفت‌وگوی باز` : ""}</p></header>
      <div className={`ac ${sel ? "has" : ""}`}>
        <div className="ac-list">
          {!chats ? <p className="muted">…</p> : !chats.length ? <p className="muted">هنوز گفت‌وگویی نیست. ویجت چت روی همه صفحه‌های سایت فعال است.</p> : chats.map((c) => (
            <button key={c.id} className={`ac-row ${c.id === sel ? "on" : ""} ${c.status === "closed" ? "adm-off" : ""}`} onClick={() => setSel(c.id)}>
              <span className="ac-n"><b>{c.name || (c.mobile ? fa(c.mobile) : `مهمان ${fa(c.id)}`)}</b>{c.unread > 0 && <i className="num">{fa(c.unread)}</i>}</span>
              <small className="muted ac-last">{c.last}</small>
              <small className="muted">{ago(c.updatedAt)}</small>
            </button>
          ))}
        </div>
        <div className="ac-thread">
          {!sel || !t ? <p className="muted ac-empty">یک گفت‌وگو را انتخاب کن.</p> : (
            <>
              <div className="ac-th">
                <button className="link ac-back" onClick={() => setSel(null)}>بازگشت</button>
                <div><b>{cur?.name || (t.mobile ? fa(t.mobile) : "مهمان")}</b><small className="muted">{t.mobile ? <span className="num">{fa(t.mobile)}</span> : "وارد نشده"} • صفحه <span className="en">{t.page || "/"}</span></small></div>
                {t.status === "open" ? <button className="btn btn-ghost" onClick={() => setStatus("closed")}>بستن گفت‌وگو</button> : <button className="btn btn-ghost" onClick={() => setStatus("open")}>بازکردن</button>}
              </div>
              <div className="ac-msgs" ref={list}>
                {t.messages.map((m) => <div key={m.id} className={`chat-m ${m.author === "admin" ? "user" : "admin"}`}><p>{m.body}</p><small>{new Date(m.at).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}</small></div>)}
              </div>
              <div className="ac-saved">{SAVED.map((s) => <button key={s} onClick={() => setText(s)}>{s.slice(0, 28)}…</button>)}</div>
              <form className="chat-f ac-f" onSubmit={(e) => { e.preventDefault(); reply(text); }}>
                <textarea rows={2} value={text} placeholder="پاسخ…" onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); reply(text); } }} />
                <button type="submit" disabled={!text.trim()} aria-label="ارسال"><Icon id="arrow" /></button>
              </form>
            </>
          )}
        </div>
      </div>
    </>
  );
}
