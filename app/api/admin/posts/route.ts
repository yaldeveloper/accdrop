import { revalidatePath } from "next/cache";
import { allPosts, savePost } from "@/lib/server/blog";
import { body, fail, json, route, withAdmin } from "@/lib/server/http";
import type { Post } from "@/lib/blog";

export const GET = route(async () => withAdmin(async () => json({ posts: await allPosts(true) })));

/** Creates or replaces a post. */
export const POST = route(async (req: Request) => withAdmin(async () => {
  const b = await body<Post>(req);
  const slug = String(b.slug ?? "").trim().toLowerCase();
  const title = String(b.title ?? "").trim().slice(0, 160);
  if (!/^[a-z0-9-]{3,80}$/.test(slug)) return fail("bad_slug");
  if (!title) return fail("bad_title");
  const list = (v: unknown) => (Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean).slice(0, 12) : []);
  await savePost({
    slug, title, excerpt: String(b.excerpt ?? "").slice(0, 400), body: String(b.body ?? "").slice(0, 60000),
    tags: list(b.tags), products: list(b.products), cover: /^#[0-9a-fA-F]{6}$/.test(String(b.cover)) ? String(b.cover) : "#B9FF63",
    published: !!b.published, createdAt: Number(b.createdAt) || undefined,
  });
  revalidatePath("/blog"); revalidatePath(`/blog/${slug}`);
  return json({ ok: true, slug });
}));
