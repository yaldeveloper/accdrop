import { db } from "@/lib/server/db";
import { json, route, withAdmin } from "@/lib/server/http";
import { stockSummary } from "@/lib/server/orders";
import { openChatCount } from "@/lib/server/chat";

export const GET = route(async () => withAdmin(async () => {
  const sql = await db();
  const [s] = await sql`
    select
      coalesce(sum(total) filter (where paid_at >= date_trunc('day', now() at time zone 'Asia/Tehran') at time zone 'Asia/Tehran'), 0)::bigint as today,
      count(*) filter (where paid_at >= date_trunc('day', now() at time zone 'Asia/Tehran') at time zone 'Asia/Tehran')::int as today_n,
      coalesce(sum(total) filter (where paid_at >= now() - interval '30 days'), 0)::bigint as month,
      count(*) filter (where paid_at >= now() - interval '30 days')::int as month_n,
      count(*) filter (where status in ('paid', 'activating'))::int as open
    from orders`;
  const [r] = await sql`select count(*)::int as n from resellers where status = 'pending'`;
  const [u] = await sql`select count(*)::int as n from users`;
  const [t] = await sql`select count(*)::int as n from tickets where status = 'open'`;
  const stock = await stockSummary();
  return json({
    today: Number(s.today), todayCount: s.today_n, month: Number(s.month), monthCount: s.month_n, open: s.open,
    pendingResellers: r.n, users: u.n, openTickets: t.n, openChats: await openChatCount(),
    lowStock: stock.filter((x) => x.free < 3 || x.waiting > 0),
  });
}));
