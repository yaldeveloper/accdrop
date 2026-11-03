import { SEED_POSTS, type Post } from "@/lib/blog";
import { db, dbUrl } from "./db";

const fromRow = (r: Record<string, unknown>): Post => ({
  slug: String(r.slug), title: String(r.title), excerpt: String(r.excerpt), body: String(r.body),
  tags: String(r.tags || "").split(",").map((x) => x.trim()).filter(Boolean),
  products: String(r.products || "").split(",").map((x) => x.trim()).filter(Boolean),
  cover: String(r.cover || "#B9FF63"), published: !!r.published,
  createdAt: new Date(r.created_at as string).getTime(), updatedAt: new Date(r.updated_at as string).getTime(),
});

/** Built-in posts merged with posts from the panel (a panel post replaces the built-in one with the same slug). */
export async function allPosts(includeDrafts = false): Promise<Post[]> {
  let rows: Post[] = [];
  if (dbUrl()) {
    try { const sql = await db(); rows = (await sql`select * from posts`).map(fromRow); } catch { /* fall back to built-in posts */ }
  }
  const map = new Map(SEED_POSTS.map((p) => [p.slug, p]));
  for (const p of rows) map.set(p.slug, p);
  return [...map.values()].filter((p) => includeDrafts || p.published).sort((a, b) => b.createdAt - a.createdAt);
}

export async function getPost(slug: string, includeDrafts = false) {
  return (await allPosts(includeDrafts)).find((p) => p.slug === slug) ?? null;
}

export async function savePost(p: Omit<Post, "createdAt" | "updatedAt"> & { createdAt?: number }) {
  const sql = await db();
  const created = new Date(p.createdAt ?? Date.now());
  await sql`insert into posts (slug, title, excerpt, body, tags, products, cover, published, created_at)
    values (${p.slug}, ${p.title}, ${p.excerpt}, ${p.body}, ${p.tags.join(",")}, ${p.products.join(",")}, ${p.cover}, ${p.published}, ${created})
    on conflict (slug) do update set title = excluded.title, excerpt = excluded.excerpt, body = excluded.body, tags = excluded.tags,
      products = excluded.products, cover = excluded.cover, published = excluded.published, updated_at = now()`;
}

export async function deletePost(slug: string) {
  const sql = await db();
  await sql`delete from posts where slug = ${slug}`;
}
