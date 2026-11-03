import type { Metadata } from "next";
import Link from "next/link";
import { allPosts } from "@/lib/server/blog";
import { readMinutes } from "@/lib/blog";
import { fa, faDate } from "@/lib/format";
import { Eyebrow } from "@/components/brand";

export const revalidate = 60;
export const metadata: Metadata = {
  title: "بلاگ اک‌دراپ: راهنمای خرید و مقایسه سرویس‌های هوش مصنوعی",
  description: "راهنمای خرید، مقایسه و آموزش ChatGPT، Claude، Cursor، Adobe و سرویس‌های دیجیتال دیگر به زبان ساده.",
  alternates: { canonical: "/blog" },
};

export default async function BlogPage({ searchParams }: { searchParams: Promise<{ tag?: string }> }) {
  const { tag } = await searchParams;
  const posts = await allPosts();
  const tags = [...new Set(posts.flatMap((p) => p.tags))];
  const list = tag ? posts.filter((p) => p.tags.includes(tag)) : posts;
  const [first, ...rest] = list;
  return (
    <main className="bl">
      <section className="bl-top">
        <div className="wrap">
          <nav className="crumbs" aria-label="مسیر"><Link href="/">اک‌دراپ</Link><span>/</span><span>بلاگ</span></nav>
          <Eyebrow>بلاگ</Eyebrow>
          <h1>راهنمای خرید،<br /><b>به زبان ساده.</b></h1>
          <div className="bl-tags">
            <Link href="/blog" className={!tag ? "on" : ""}>همه</Link>
            {tags.map((t) => <Link key={t} href={`/blog?tag=${encodeURIComponent(t)}`} className={tag === t ? "on" : ""}>{t}</Link>)}
          </div>
        </div>
      </section>
      <section className="light bl-body">
        <div className="wrap">
          {!first ? <p className="muted">مطلبی نیست.</p> : (
            <>
              <Link href={`/blog/${first.slug}`} className="bl-hero" style={{ "--c": first.cover } as React.CSSProperties}>
                <span className="bl-cover"><i /><i /><i /></span>
                <div><small>{first.tags.join(" • ")}</small><h2>{first.title}</h2><p>{first.excerpt}</p><small className="muted">{faDate(first.createdAt, false)} • {fa(readMinutes(first.body))} دقیقه مطالعه</small></div>
              </Link>
              <div className="bl-grid">
                {rest.map((p) => (
                  <Link key={p.slug} href={`/blog/${p.slug}`} className="bl-card" style={{ "--c": p.cover } as React.CSSProperties}>
                    <span className="bl-cover"><i /><i /><i /></span>
                    <small>{p.tags.join(" • ")}</small>
                    <h3>{p.title}</h3>
                    <p>{p.excerpt}</p>
                    <small className="muted">{faDate(p.createdAt, false)} • {fa(readMinutes(p.body))} دقیقه</small>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
