"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { faDate } from "@/lib/format";
import { api, useAccount } from "./account";
import { Icon } from "./brand";

export type ChatMsg = { id: number; author: "user" | "admin"; body: string; at: number };
const SEEN = "accdrop-chat";
const QUICK = ["کدام سرویس برایم مناسب است؟", "سفارشم کی فعال می‌شود؟", "خرید گروهی چطور است؟", "مشکل در پرداخت دارم"];

/** Opens the chat from anywhere: window.dispatchEvent(new Event("ad-chat")). */
export const openChat = () => window.dispatchEvent(new Event("ad-chat"));

const time = (t: number) => new Date(t).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" });

/** Floating live-chat widget for every visitor; messages go to /admin/chat. */
export function ChatWidget() {
  const path = usePathname();
  const { user } = useAccount();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [unread, setUnread] = useState(0);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [started, setStarted] = useState(false);
  const last = useRef(0);
  const list = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { try { setStarted(localStorage.getItem(SEEN) === "1"); } catch { /* ignore */ } }, []);
  useEffect(() => {
    const on = () => setOpen(true);
    addEventListener("ad-chat", on);
    return () => removeEventListener("ad-chat", on);
  }, []);

  const poll = useCallback(async () => {
    const r = await api<{ messages: ChatMsg[]; unread: number }>(`/api/chat?after=${last.current}`);
    if (r.error || !r.messages) return;
    if (r.messages.length) {
      last.current = r.messages[r.messages.length - 1].id;
      setMsgs((m) => [...m, ...r.messages.filter((x) => !m.some((y) => y.id === x.id))]);
    }
    if (r.unread) setUnread((u) => u + r.unread);
  }, []);

  // Poll quickly while open; slowly in the background, only for visitors who have chatted before.
  useEffect(() => {
    if (!open && !started) return;
    poll();
    const t = setInterval(() => { if (!document.hidden) poll(); }, open ? 4000 : 30000);
    return () => clearInterval(t);
  }, [open, started, poll]);

  useEffect(() => { if (open) { setUnread(0); setTimeout(() => input.current?.focus(), 50); } }, [open]);
  useEffect(() => { list.current?.scrollTo({ top: list.current.scrollHeight }); }, [msgs, open]);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  }, [open]);

  const send = async (body: string) => {
    const b = body.trim();
    if (!b || sending) return;
    setSending(true); setError("");
    const r = await api<{ message: ChatMsg }>("/api/chat", { body: { body: b, page: path } });
    setSending(false);
    if (r.error || !r.message) { setError(r.error === "too_many" ? "کمی صبر کن و دوباره بفرست." : "پیام ارسال نشد. دوباره امتحان کن."); return; }
    setText("");
    last.current = Math.max(last.current, r.message.id);
    setMsgs((m) => [...m, r.message]);
    if (!started) { setStarted(true); try { localStorage.setItem(SEEN, "1"); } catch { /* ignore */ } }
  };

  if (path.startsWith("/admin")) return null;
  const now = Date.now();
  const online = (() => { const h = new Date(now).getUTCHours() + 3.5; const x = (h + 24) % 24; return x >= 9 && x < 24; })();

  return (
    <>
      <button className={`chat-fab ${open ? "hide" : ""} ${path === "/checkout" ? "up" : ""}`} onClick={() => setOpen(true)} aria-label="چت با پشتیبانی" aria-expanded={open}>
        <Icon id="chat" />
        <span className="chat-fab-t">پشتیبانی آنلاین</span>
        {unread > 0 && <i className="chat-badge num">{unread}</i>}
      </button>
      <section className={`chat ${open ? "on" : ""}`} role="dialog" aria-label="چت با پشتیبانی" aria-hidden={!open} inert={!open}>
        <header className="chat-h">
          <div className="chat-av"><Icon id="chat" /><i className={online ? "on" : ""} /></div>
          <div><b>پشتیبانی اک‌دراپ</b><small>{online ? "آنلاین؛ معمولاً چند دقیقه‌ای جواب می‌دهیم" : "الان آفلاین؛ صبح جواب می‌دهیم"}</small></div>
          <button className="chat-x" onClick={() => setOpen(false)} aria-label="بستن">×</button>
        </header>
        <div className="chat-list" ref={list} aria-live="polite">
          <div className="chat-m admin"><p>سلام{user?.name ? ` ${user.name}` : ""}! سؤالت درباره انتخاب سرویس، خرید یا سفارش را همین‌جا بپرس.</p></div>
          {msgs.map((m, i) => {
            const day = i === 0 || new Date(msgs[i - 1].at).toDateString() !== new Date(m.at).toDateString();
            return (
              <div key={m.id} className="chat-row">
                {day && <small className="chat-day">{faDate(m.at, false)}</small>}
                <div className={`chat-m ${m.author}`}><p>{m.body}</p><small>{time(m.at)}</small></div>
              </div>
            );
          })}
          {!msgs.length && (
            <div className="chat-quick">{QUICK.map((q) => <button key={q} onClick={() => send(q)} disabled={sending}>{q}</button>)}</div>
          )}
        </div>
        {error && <p className="chat-err" role="alert">{error}</p>}
        <form className="chat-f" onSubmit={(e) => { e.preventDefault(); send(text); }}>
          <textarea ref={input} rows={1} value={text} placeholder="پیامت را بنویس…" aria-label="پیام" maxLength={1500}
            onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(text); } }} />
          <button type="submit" disabled={!text.trim() || sending} aria-label="ارسال"><Icon id="arrow" /></button>
        </form>
        {!user && <small className="chat-foot">برای پیگیری سفارش، <Link href={`/login?next=${encodeURIComponent(path)}`}>وارد حسابت شو</Link> تا شماره‌ات را ببینیم.</small>}
      </section>
    </>
  );
}
