// Support tickets: shared types and labels for the browser and the server.
export type TicketStatus = "open" | "answered" | "closed";
export type TicketTopic = "order" | "activation" | "payment" | "request" | "reseller" | "other";
export type TicketMessage = { id: number; author: "user" | "admin"; body: string; createdAt: number };
export type Ticket = {
  id: number; mobile: string; topic: TicketTopic; subject: string; orderCode: string | null;
  status: TicketStatus; createdAt: number; updatedAt: number; messages?: TicketMessage[]; name?: string; last?: string;
};

export const TOPICS: Record<TicketTopic, string> = {
  order: "پیگیری سفارش",
  activation: "مشکل در فعال‌سازی یا اکانت",
  payment: "پرداخت و بازگشت وجه",
  request: "درخواست سرویس جدید",
  reseller: "نمایندگی فروش",
  other: "سایر",
};

export const TICKET_STATUS: Record<TicketStatus, string> = { open: "در انتظار پاسخ", answered: "پاسخ داده شد", closed: "بسته شد" };
export const TICKET_MAX_BODY = 3000;
