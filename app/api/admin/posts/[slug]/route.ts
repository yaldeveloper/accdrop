import { revalidatePath } from "next/cache";
import { deletePost } from "@/lib/server/blog";
import { json, route, withAdmin } from "@/lib/server/http";

export const DELETE = route(async (_req: Request, { params }: { params: Promise<{ slug: string }> }) => withAdmin(async () => {
  const { slug } = await params;
  await deletePost(slug);
  revalidatePath("/blog"); revalidatePath(`/blog/${slug}`);
  return json({ ok: true });
}));
