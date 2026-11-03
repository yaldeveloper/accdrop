// A small, product-specific scene on each product page, drawn with HTML and CSS in the product's colours.
import type { CSSProperties } from "react";
import { themeOf } from "@/lib/theme";
import { productById } from "@/lib/catalog";
import { fa } from "@/lib/format";
import { BrandLogo } from "./brand";

export function Scene({ id }: { id: string }) {
  const t = themeOf(id), p = productById(id);
  const style = { "--b": t.c, "--b2": t.c2 } as CSSProperties;
  const head = (title: string) => (
    <div className="sc-bar"><i /><i /><i /><span className="en">{title}</span></div>
  );
  let body: React.ReactNode;
  switch (t.motif) {
    case "chat":
      body = (<>
        {head(p.name)}
        <div className="sc-chat">
          <p className="me">{t.ask}</p>
          <div className="ai"><span className="sc-av"><BrandLogo id={id} size={14} /></span><p>{t.reply}</p></div>
          <div className="sc-input"><span>پیام بنویس…</span><b>↑</b></div>
        </div>
      </>);
      break;
    case "code":
      body = (<>
        {head("app/checkout.ts")}
        <pre className="sc-code en" dir="ltr"><code>
          <span><em>1</em><span className="k">export async function</span> <span className="f">pay</span>(order) {"{"}</span>
          <span><em>2</em>  <span className="k">const</span> total = order.lines.<span className="f">reduce</span>(</span>
          <span className="ghost"><em>3</em>    (sum, l) =&gt; sum + l.price, 0);</span>
          <span className="ghost"><em>4</em>  <span className="k">return</span> gateway.<span className="f">start</span>(total);</span>
          <span><em>5</em>{"}"}</span>
        </code><small className="sc-tab">Tab ↹ برای قبول پیشنهاد</small></pre>
      </>);
      break;
    case "canvas":
      body = (<>
        {head("poster-final.psd")}
        <div className="sc-canvas"><div className="art"><i className="s1" /><i className="s2" /><i className="s3" /><b className="en">SALE</b></div>
          <ul className="tools">{[0, 1, 2, 3, 4].map((i) => <li key={i} className={i === 1 ? "on" : ""} />)}</ul></div>
      </>);
      break;
    case "video":
      body = (<>
        {head("reel_01.mp4")}
        <div className="sc-video"><div className="frame"><b>▶</b><small className="num en">00:12 / 00:30</small></div>
          <div className="tl">{[34, 18, 26, 22].map((w, i) => <i key={i} style={{ flexGrow: w }} />)}<span className="ph" /></div>
          <div className="tl a">{[50, 30, 20].map((w, i) => <i key={i} style={{ flexGrow: w }} />)}</div></div>
      </>);
      break;
    case "doc":
      body = (<>
        {head("Roadmap")}
        <div className="sc-doc"><b>برنامه این هفته</b>
          {["طراحی صفحه محصول", "اتصال درگاه پرداخت", "تست روی موبایل"].map((x, i) => <label key={x}><i className={i < 2 ? "on" : ""} />{x}</label>)}
          <div className="db">{["ایده", "در حال انجام", "انجام شد"].map((x) => <span key={x}>{x}</span>)}</div></div>
      </>);
      break;
    case "work":
      body = (<>
        {head("LinkedIn")}
        <div className="sc-work"><div className="cover" /><span className="pic" /><b>طراح محصول <i className="en">in</i></b>
          <small>۳ پیام InMail جدید • ۲۸ نفر پروفایلت را دیدند</small><div className="bars">{[40, 64, 52, 88].map((h, i) => <i key={i} style={{ height: `${h}%` }} />)}</div></div>
      </>);
      break;
    case "lang":
      body = (<>
        {head("Duolingo")}
        <div className="sc-lang"><div className="streak"><b className="num">{fa(127)}</b><small>روز پشت‌سرهم</small></div>
          <div className="q"><small>ترجمه کن</small><b className="en">I would like a coffee</b>
            <div>{["دوست", "دارم", "یک", "قهوه"].map((w) => <span key={w}>{w}</span>)}</div></div>
          <div className="xp"><i style={{ width: "72%" }} /></div></div>
      </>);
      break;
    case "tg":
      body = (<>
        {head("Telegram")}
        <div className="sc-tg"><span className="pic" /><b>Danial <i>★</i></b><small>Premium تا ۱۴۰۵/۱۲/۲۰</small>
          <ul>{["آپلود فایل تا ۴ گیگ", "تبدیل پیام صوتی به متن", "بدون تبلیغ"].map((x) => <li key={x}>{x}</li>)}</ul></div>
      </>);
      break;
    case "stars":
      body = (<>
        {head("Telegram Stars")}
        <div className="sc-stars"><b className="num">★ {fa(500)}</b><small>موجودی استارز</small>
          <div className="row"><span>اشتراک کانال</span><span className="num">−{fa(50)} ★</span></div>
          <div className="row"><span>هدیه به دوست</span><span className="num">−{fa(25)} ★</span></div></div>
      </>);
      break;
    case "gift":
      body = (
        <div className="sc-gift"><div className="card"><BrandLogo id="applegift" size={30} /><b className="en">$25</b><small className="en">App Store &amp; iTunes</small>
          <span className="code en">XXXX-XXXX-XXXX-XXXX</span></div></div>
      );
      break;
    case "appleid":
      body = (<>
        {head("Apple Account")}
        <div className="sc-aid"><span className="ring"><BrandLogo id="appleid" size={28} /></span><b>اپل آیدی آمریکا</b>
          <small>App Store • iCloud • Apple Music</small><div className="chips">{["US", "UK", "TR"].map((c) => <span key={c} className="en">{c}</span>)}</div></div>
      </>);
      break;
    case "sim":
      body = (<>
        {head("SMS")}
        <div className="sc-sim"><b className="en num">+1 (555) 014‑2290</b>
          <div className="sms"><small className="en">WhatsApp</small><p>کد تأیید شما: <b className="en">482 913</b></p></div>
          <div className="sms dim"><small className="en">Telegram</small><p>کد ورود: <b className="en">71 204</b></p></div></div>
      </>);
      break;
  }
  return <div className={`scene sc-${t.motif}`} style={style} aria-hidden>{body}</div>;
}
