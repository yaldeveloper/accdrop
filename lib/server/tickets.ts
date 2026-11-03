import { TICKET_MAX_BODY, TOPICS, type Ticket, type TicketStatus, type TicketTopic } from "@/lib/tickets";
import { db } from "./db";
import { sendTicketSms } from "./sms";

const ms = (d: Date) => new Date(d).getTime();
const MAX_OPEN = 5;

type Row = Record<string, unknown>;
const toTicket = (t: Row): Ticket => ({
  id: t.id as number, mobile: t.mobile as string, topic: t.topic as TicketTopic, subject: t.subject as string,
  orderCode: (t.order_code as string) ?? null, status: t.status as TicketStatus,
  createdAt: ms(t.created_at as Date), updatedAt: ms(t.updated_at as Date),
  name: (t.name as string) ?? undefined, last: (t.last as string) ?? undefined,
});

export const cleanBody = (s: unknown) => String(s ?? "").replace(/\r/g, "").trim().slice(0, TICKET_MAX_BODY);

export async function listTickets(where: { mobile?: string; status?: string; q?: string }) {
  const sql = await db();
  const q = where.q?.trim();
  const rows = await sql`
    select t.*, u.name, (select body from ticket_messages m where m.ticket_id = t.id order by m.id desc limit 1) as last
    from tickets t join users u on u.mobile = t.mobile
    where true
      ${where.mobile ? sql`and t.mobile = ${where.mobile}` : sql``}
      ${where.status ? sql`and t.status = ${where.status}` : sql``}
      ${q ? sql`and (t.subject ilike ${"%" + q + "%"} or t.mobile like ${"%" + q.replace(/\D/g, "") + "%"} or t.order_code ilike ${"%" + q + "%"} or t.id::text = ${q.replace(/\D/g, "")})` : sql``}
    order by (t.status = 'open') desc, t.updated_at desc limit 300`;
  return rows.map(toTicket);
}

export async function getTicket(id: number, mobile?: string) {
  const sql = await db();
  const [t] = await sql`select t.*, u.name from tickets t join users u on u.mobile = t.mobile
    where t.id = ${id} ${mobile ? sql`and t.mobile = ${mobile}` : sql``}`;
  if (!t) return null;
  const msgs = await sql`select id, author, body, created_at from ticket_messages where ticket_id = ${id} order by id`;
  return { ...toTicket(t), messages: msgs.map((m) => ({ id: m.id, author: m.author, body: m.body, createdAt: ms(m.created_at) })) } as Ticket;
}

export async function createTicket(mobile: string, input: { topic?: string; subject?: string; orderCode?: string; body?: string }) {
  const topic = (input.topic && input.topic in TOPICS ? input.topic : "other") as TicketTopic;
  const subject = String(input.subject ?? "").trim().slice(0, 120) || TOPICS[topic];
  const body = cleanBody(input.body);
  if (body.length < 5) return { error: "short_body" as const };
  const sql = await db();
  const [{ n }] = await sql`select count(*)::int as n from tickets where mobile = ${mobile} and status <> 'closed'`;
  if (n >= MAX_OPEN) return { error: "too_many" as const };
  let orderCode: string | null = String(input.orderCode ?? "").trim().toUpperCase() || null;
  if (orderCode) {
    const [o] = await sql`select code from orders where code = ${orderCode} and mobile = ${mobile}`;
    if (!o) orderCode = null;
  }
  const id = await sql.begin(async (tx) => {
    const [t] = await tx`insert into tickets (mobile, topic, subject, order_code) values (${mobile}, ${topic}, ${subject}, ${orderCode}) returning id`;
    await tx`insert into ticket_messages (ticket_id, author, body) values (${t.id}, 'user', ${body})`;
    return t.id as number;
  });
  return { id };
}

/** A new message from the customer reopens the ticket; one from support marks it answered and texts the customer. */
export async function addMessage(id: number, author: "user" | "admin", bodyIn: unknown, mobile?: string) {
  const body = cleanBody(bodyIn);
  if (body.length < 2) return { error: "short_body" as const };
  const sql = await db();
  const [t] = await sql`select mobile from tickets where id = ${id} ${mobile ? sql`and mobile = ${mobile}` : sql``}`;
  if (!t) return { error: "not_found" as const };
  await sql`insert into ticket_messages (ticket_id, author, body) values (${id}, ${author}, ${body})`;
  await sql`update tickets set status = ${author === "admin" ? "answered" : "open"}, updated_at = now() where id = ${id}`;
  if (author === "admin") await sendTicketSms(t.mobile, id);
  return { ok: true as const };
}

export async function setTicketStatus(id: number, status: TicketStatus, mobile?: string) {
  const sql = await db();
  const r = await sql`update tickets set status = ${status}, updated_at = now() where id = ${id} ${mobile ? sql`and mobile = ${mobile}` : sql``} returning id`;
  return r.length > 0;
}
