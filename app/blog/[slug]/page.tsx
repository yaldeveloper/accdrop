import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PRODUCTS, minPrice } from "@/lib/catalog";
import { productHref } from "@/lib/content";
import { readMinutes } from "@/lib/blog";
import { allPosts, getPost } from "@/lib/server/blog";
import { loadCatalog } from "@/lib/server/catalog";
import { fa, faDate, money } from "@/lib/format";
import { BrandLogo, Icon } from "@/components/brand";
import { Markdown, slugifyHeading } from "@/components/md";

export const revalidate = 60;
export const dynamicParams = true;

export async function generateStaticParams() {
  return (await allPosts()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await getPost((await params).slug);
  if (!p) return {};
  return { title: p.title, description: p.excerpt, alternates: { canonical: `/blog/${p.slug}` }, openGraph: { title: p.title, description: p.excerpt, type: "article", locale: "fa_IR" } };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  await loadCatalog();
  const post = await getPost((await params).slug);
  if (!post) notFound();
  const products = post.products.map((id) => PRODUCTS.find((p) => p.id === id)).filter((p) => !!p);
  const heads = post.body.split("\n").filter((l) => l.startsWith("## ")).map((l) => l.slice(3));
  const more = (await allPosts()).filter((p) => p.slug !== post.slug).slice(0, 2);
  const ld = { "@context": "https://schema.org", "@type": "BlogPosting", headline: post.title, description: post.excerpt, datePublished: new Date(post.createdAt).toISOString(), dateModified: new Date(post.updatedAt).toISOString(), inLanguage: "fa-IR", author: { "@type": "Organization", name: "AccDrop" } };
  return (
    <main className="bp" style={{ "--c": post.cover } as React.CSSProperties}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <section className="bp-top">
        <div className="wrap bp-narrow">
          <nav className="crumbs" aria-label="مسیر"><Link href="/">اک‌دراپ</Link><span>/</span><Link href="/blog">بلاگ</Link></nav>
          <small className="bp-tags">{post.tags.join(" • ")}</small>
          <h1>{post.title}</h1>
          <p className="bp-ex">{post.excerpt}</p>
          <small className="muted">{faDate(post.createdAt, false)} • {fa(readMinutes(post.body))} دقیقه مطالعه</small>
        </div>
      </section>
      <div className="light">
        <div className="wrap bp-g">
          <article className="bp-body"><Markdown text={post.body} /></article>
          <aside className="bp-side">
            {heads.length > 1 && (
              <nav className="bp-toc" aria-label="فهرست"><b>در این مطلب</b>{heads.map((h) => <a key={h} href={`#${slugifyHeading(h)}`}>{h}</a>)}</nav>
            )}
            {products.length > 0 && (
              <div className="bp-prods">
                <b>سرویس‌های این مطلب</b>
                {products.map((p) => (
                  <Link key={p.id} href={productHref(p)}><span className="mono"><BrandLogo id={p.id} size={18} /></span><span className="en">{p.name}</span><small className="num">از {money(minPrice(p))}</small><Icon id="arrow" className="arrow" /></Link>
                ))}
              </div>
            )}
          </aside>
        </div>
        {more.length > 0 && (
          <div className="wrap bp-more">
            <h2>بیشتر بخوان</h2>
            <div className="bl-grid">{more.map((p) => (
              <Link key={p.slug} href={`/blog/${p.slug}`} className="bl-card" style={{ "--c": p.cover } as React.CSSProperties}>
                <span className="bl-cover"><i /><i /><i /></span><small>{p.tags.join(" • ")}</small><h3>{p.title}</h3><p>{p.excerpt}</p>
              </Link>
            ))}</div>
          </div>
        )}
      </div>
    </main>
  );
}
