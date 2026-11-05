import { revalidatePath } from "next/cache";
import { json, route, withAdmin } from "@/lib/server/http";
import { loadCatalog } from "@/lib/server/catalog";
import { runSync, syncReport } from "@/lib/server/sync";

export const maxDuration = 60;

/** Supplier sync status: recent runs, every option bought automatically and new products at the suppliers. */
export const GET = route(async () => withAdmin(async () => { await loadCatalog(); return json(await syncReport()); }));

/** «همگام‌سازی الان»: runs a sync unless one started in the last minute. */
export const POST = route(async () => withAdmin(async () => {
  await loadCatalog();
  const summary = await runSync("admin", 1);
  revalidatePath("/", "layout");
  return json({ ran: !!summary, summary, ...(await syncReport()) });
}));
