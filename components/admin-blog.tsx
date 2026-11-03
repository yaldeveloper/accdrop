"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ALL_PRODUCTS } from "@/lib/catalog";
import type { Post } from "@/lib/blog";
import { faDate } from "@/lib/format";
import { api } from "./account";
import { BrandLogo } from "./brand";
import { useStore } from "./store";

export function AdminBlog() {
  const [posts, setPosts] = useState<Post[] | null>(null);
  useEffect(() => { api<{ posts: Post[] }>("/api/admin/posts").then((r) => r.posts && setPosts(r.posts)); }, []);
  return (
    <>
      <header className="dash-h ap-h">
        <div><h1>بلاگ</h1><p className="muted">مطالب با نوشتار ساده (Markdown) نوشته می‌شوند و بعد از ذخیره روی سایت می‌آیند.</p></div>
        <Link className="btn btn-paper" href="/admin/blog/new">+ مطلب جدید</Link>
      </header>
      {!posts ? <p className="muted">…</p> : (
        <div className="ap-list">{posts.map((p) => (
          <Link key={p.slug} href={`/admin/blog/${p.slug}`} className={`ap-row ${p.published ? "" : "adm-off"}`}>
            <span className="ap-logo" style={{ background: p.cover }} />
            <span className="ap-n"><b>{p.title}</b><small className="muted">{p.tags.join(" • ") || "بدون برچسب"}</small></span>
            <span className="ap-tags">{!p.published && <i className="ap-tag warn">پیش‌نویس</i>}</span>
            <span className="ap-p">{faDate(p.createdAt, false)}</span>
            <span />
          </Link>
        ))}</div>
      )}
    </>
  );
}

const EMPTY = { slug: "", title: "", excerpt: "", body: "## عنوان بخش\nمتن…", tags: "", products: [] as string[], cover: "#B9FF63", published: false };

export function AdminPost({ slug }: { slug: string }) {
  const isNew = slug === "new";
  const router = useRouter();
  const { notify } = useStore();
  const [d, setD] = useState<typeof EMPTY & { createdAt?: number } | null>(isNew ? EMPTY : null);
  const [err, setErr] = useState("");
  useEffect(() => {
    if (isNew) return;
    api<{ posts: Post[] }>("/api/admin/posts").then((r) => {
      const p = r.posts?.find((x) => x.slug === slug);
      if (p) setD({ ...p, tags: p.tags.join("، ") });
    });
  }, [isNew, slug]);
  if (!d) return <p className="muted">…</p>;
  const set = (patch: Partial<typeof EMPTY>) => setD({ ...d, ...patch });
  const save = async () => {
    setErr("");
    const r = await api("/api/admin/posts", { body: { ...d, tags: d.tags.split(/[،,]/).map((x) => x.trim()).filter(Boolean) } });
    if (r.error) { setErr(r.error === "bad_slug" ? "آدرس فقط حروف کوچک انگلیسی، عدد و خط تیره (حداقل ۳ حرف)" : "عنوان را بنویس"); return; }
    notify("ذخیره شد");
    if (isNew) router.replace(`/admin/blog/${d.slug}`);
  };
  const remove = async () => {
    if (!confirm("نسخه پنل این مطلب حذف شود؟ (مطالب پیش‌فرض به متن اولیه برمی‌گردند)")) return;
    await api(`/api/admin/posts/${slug}`, { method: "DELETE" });
    router.replace("/admin/blog");
  };
  return (
    <>
      <nav className="crumbs" aria-label="مسیر"><Link href="/admin/blog">بلاگ</Link><span>/</span><span>{isNew ? "جدید" : d.title}</span></nav>
      <header className="dash-h ap-h"><div><h1>{isNew ? "مطلب جدید" : "ویرایش مطلب"}</h1></div>{!isNew && <a className="btn btn-ghost" href={`/blog/${slug}`} target="_blank" rel="noreferrer">دیدن مطلب</a>}</header>
      <div className="ap-g">
        <div className="ap-form">
          <section className="ap-sec">
            <label className="ap-f"><span>عنوان</span><input className="adm-in" value={d.title} onChange={(e) => set({ title: e.target.value })} /></label>
            <div className="ap-2">
              <label className="ap-f"><span>آدرس (انگلیسی)</span><input className="adm-in ltr" value={d.slug} disabled={!isNew} placeholder="chatgpt-guide" onChange={(e) => set({ slug: e.target.value })} /></label>
              <label className="ap-f"><span>برچسب‌ها (با ویرگول)</span><input className="adm-in" value={d.tags} onChange={(e) => set({ tags: e.target.value })} /></label>
            </div>
            <label className="ap-f"><span>خلاصه (زیر عنوان و در گوگل)</span><textarea rows={2} value={d.excerpt} onChange={(e) => set({ excerpt: e.target.value })} /></label>
            <label className="ap-f"><span>متن: «## » برای تیتر، «- » برای فهرست، «{">"} » برای نکته، **پررنگ** و [متن](/لینک)</span><textarea rows={22} value={d.body} onChange={(e) => set({ body: e.target.value })} className="ab-body" /></label>
          </section>
        </div>
        <aside className="ap-side">
          <div className="ap-pub">
            <label className="ap-sw"><input type="checkbox" checked={d.published} onChange={(e) => set({ published: e.target.checked })} /><span><b>{d.published ? "منتشر شده" : "پیش‌نویس"}</b><small className="muted">{d.published ? "روی سایت دیده می‌شود." : "فقط در پنل."}</small></span></label>
            <label className="ap-f"><span>رنگ کاور</span><span className="ap-color"><input type="color" value={d.cover} onChange={(e) => set({ cover: e.target.value })} /><input className="adm-in ltr" value={d.cover} onChange={(e) => set({ cover: e.target.value })} /></span></label>
            {err && <p className="ap-err" role="alert">{err}</p>}
            <button className="btn btn-paper btn-block" onClick={save}>ذخیره</button>
            {!isNew && <button className="link adm-danger" onClick={remove}>حذف</button>}
          </div>
          <div className="ap-pub">
            <b style={{ fontSize: 14, fontWeight: 500 }}>سرویس‌های مرتبط</b>
            <div className="ab-prods">{ALL_PRODUCTS.map((p) => (
              <label key={p.id} className={`ap-chk ${d.products.includes(p.id) ? "on" : ""}`}>
                <input type="checkbox" checked={d.products.includes(p.id)} onChange={(e) => set({ products: e.target.checked ? [...d.products, p.id] : d.products.filter((x) => x !== p.id) })} />
                <BrandLogo id={p.id} size={12} /><span className="en">{p.name}</span>
              </label>
            ))}</div>
          </div>
        </aside>
      </div>
    </>
  );
}
