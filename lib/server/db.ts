// Postgres connection and schema. Works with any Postgres (Neon / Vercel Postgres, an Iranian host, or local).
// Set DATABASE_URL (or POSTGRES_URL). Tables are created on first use, so no migration step is needed to start.
import postgres from "postgres";

const g = globalThis as unknown as { __acc_sql?: postgres.Sql; __acc_schema?: Promise<void> };

export const dbUrl = () => process.env.DATABASE_URL || process.env.POSTGRES_URL || "";

function client() {
  const url = dbUrl();
  if (!url) throw new Error("DATABASE_URL is not set");
  if (!g.__acc_sql) {
    const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
    g.__acc_sql = postgres(url, { ssl: local ? false : "require", max: 5, idle_timeout: 20, onnotice: () => {} });
  }
  return g.__acc_sql;
}

const SCHEMA = `
create table if not exists users (
  mobile text primary key,
  name text not null default '',
  email text not null default '',
  blocked boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists otps (
  mobile text primary key,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  sent_at timestamptz not null default now(),
  window_start timestamptz not null default now(),
  sends int not null default 1
);
create table if not exists sessions (
  token_hash text primary key,
  mobile text not null references users(mobile) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create table if not exists discounts (
  code text primary key,
  rate numeric not null,
  active boolean not null default true,
  uses int not null default 0,
  max_uses int,
  created_at timestamptz not null default now()
);
create table if not exists orders (
  code text primary key,
  mobile text not null references users(mobile),
  status text not null,
  subtotal bigint not null,
  discount bigint not null default 0,
  total bigint not null,
  discount_code text,
  authority text,
  ref_id text,
  card_pan text,
  admin_note text not null default '',
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  activated_at timestamptz
);
create index if not exists orders_mobile on orders(mobile);
create index if not exists orders_status on orders(status);
create index if not exists orders_authority on orders(authority);
create table if not exists order_lines (
  id serial primary key,
  order_code text not null references orders(code) on delete cascade,
  idx int not null,
  product_id text not null,
  plan text not null,
  delivery text not null,
  price bigint not null,
  email text,
  username text,
  secret text,
  delivered_at timestamptz
);
create index if not exists order_lines_order on order_lines(order_code);
create table if not exists gift_codes (
  id serial primary key,
  product_id text not null,
  plan text not null,
  code text not null unique,
  line_id int references order_lines(id),
  added_at timestamptz not null default now(),
  used_at timestamptz
);
create index if not exists gift_codes_free on gift_codes(product_id, plan) where line_id is null;
create table if not exists resellers (
  mobile text primary key references users(mobile),
  business text not null,
  kind text not null,
  link text not null default '',
  volume text not null,
  note text not null default '',
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create table if not exists tickets (
  id serial primary key,
  mobile text not null references users(mobile),
  topic text not null,
  subject text not null,
  order_code text,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tickets_mobile on tickets(mobile);
create index if not exists tickets_status on tickets(status);
create table if not exists ticket_messages (
  id serial primary key,
  ticket_id int not null references tickets(id) on delete cascade,
  author text not null,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists ticket_messages_ticket on ticket_messages(ticket_id);
alter table orders add column if not exists pay_method text not null default 'card';
alter table order_lines add column if not exists seats int not null default 1;
alter table order_lines add column if not exists ip text;
alter table order_lines add column if not exists members text;
create table if not exists products (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
create table if not exists chats (
  id serial primary key,
  visitor text not null unique,
  mobile text,
  name text not null default '',
  page text not null default '',
  status text not null default 'open',
  unread_admin int not null default 0,
  unread_user int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists chats_status on chats(status, updated_at desc);
create table if not exists chat_messages (
  id serial primary key,
  chat_id int not null references chats(id) on delete cascade,
  author text not null,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists chat_messages_chat on chat_messages(chat_id, id);
create table if not exists reviews (
  id serial primary key,
  product_id text not null,
  mobile text not null references users(mobile),
  name text not null default '',
  rating int not null,
  body text not null,
  status text not null default 'pending',
  verified boolean not null default false,
  reply text not null default '',
  created_at timestamptz not null default now(),
  unique (product_id, mobile)
);
create index if not exists reviews_product on reviews(product_id, status);
create table if not exists posts (
  slug text primary key,
  title text not null,
  excerpt text not null default '',
  body text not null default '',
  tags text not null default '',
  products text not null default '',
  cover text not null default '',
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists splits (
  code text primary key,
  owner text not null references users(mobile),
  product_id text not null,
  plan text not null,
  delivery text not null,
  seats int not null,
  unit bigint not null,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists splits_owner on splits(owner);
alter table orders add column if not exists split text;
create index if not exists orders_split on orders(split) where split is not null;
alter table orders add column if not exists pay_token text;
alter table orders add column if not exists invoice jsonb;
alter table orders add column if not exists tax_id text not null default '';
alter table orders add column if not exists reminded_at timestamptz;
create table if not exists legal_profiles (
  mobile text primary key references users(mobile),
  data jsonb not null,
  updated_at timestamptz not null default now()
);
create table if not exists supplier_map (
  product_id text not null,
  plan text not null,
  supplier_id int not null,
  primary key (product_id, plan)
);
create table if not exists supplier_stock (
  product_id text not null,
  plan text not null,
  src text not null,
  ext_id text not null,
  cost numeric,
  base_cost numeric,
  available boolean not null default true,
  stock int,
  note text,
  state jsonb,
  checked_at timestamptz not null default now(),
  changed_at timestamptz not null default now(),
  primary key (product_id, plan)
);
create table if not exists supplier_seen (
  src text not null,
  ext_id text not null,
  name text not null default '',
  cost numeric,
  available boolean not null default true,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  primary key (src, ext_id)
);
create table if not exists sync_runs (
  id serial primary key,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  trigger text not null default '',
  summary jsonb
);
alter table order_lines add column if not exists supply_ref text;
alter table order_lines add column if not exists supply_cost numeric;
alter table order_lines add column if not exists num jsonb;
insert into discounts (code, rate) values ('WELCOME', 0.1) on conflict do nothing;
`;

/** The SQL client, after making sure the tables exist. */
export async function db() {
  const sql = client();
  if (!g.__acc_schema) g.__acc_schema = sql.unsafe(SCHEMA).then(() => undefined).catch((e) => { g.__acc_schema = undefined; throw e; });
  await g.__acc_schema;
  return sql;
}
