// Unpaid checkouts: everyone who reaches the gateway has signed in with their mobile, so an order left unpaid gets one
// SMS with a link back to it (the order page has «پرداخت»). Runs with the supplier sync (lib/server/sync.ts), so every
// SYNC_EVERY_MINUTES at most.
//
// Rules, so it never feels like spam:
// - one reminder per order, only for orders between REMIND_AFTER_MINUTES (default 60) and 24 hours old;
// - only the customer's latest unpaid order, and only when they haven't paid for anything since;
// - at most one reminder per mobile per 24 hours; group-buy shares («دنگ») are left out (the group has its own flow).
import { db } from "./db";
import { sendRemindSms } from "./sms";

const after = () => Math.max(15, Number(process.env.REMIND_AFTER_MINUTES) || 60);

export async function remindUnpaid(): Promise<number> {
  const sql = await db();
  const due = await sql`
    update orders o set reminded_at = now()
    where o.code in (
      select distinct on (x.mobile) x.code from orders x
      where x.status in ('pending', 'canceled') and x.split is null and x.reminded_at is null and x.total > 0
        and x.created_at < now() - make_interval(mins => ${after()}) and x.created_at > now() - interval '24 hours'
      order by x.mobile, x.created_at desc
    )
      and not exists (select 1 from orders p where p.mobile = o.mobile and p.created_at >= o.created_at
        and (p.status in ('paid', 'activating', 'active', 'refunded') or (p.code <> o.code and p.status in ('pending', 'canceled') and p.created_at > o.created_at)))
      and not exists (select 1 from orders r where r.mobile = o.mobile and r.reminded_at > now() - interval '24 hours')
      and not exists (select 1 from users u where u.mobile = o.mobile and u.blocked)
    returning o.code, o.mobile`;
  for (const o of due) await sendRemindSms(o.mobile, o.code).catch((e) => console.error("[remind]", e));
  return due.length;
}
