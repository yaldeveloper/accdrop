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
insert into discounts (code, rate) values ('WELCOME', 0.1) on conflict do nothing;
`;

/** The SQL client, after making sure the tables exist. */
export async function db() {
  const sql = client();
  if (!g.__acc_schema) g.__acc_schema = sql.unsafe(SCHEMA).then(() => undefined).catch((e) => { g.__acc_schema = undefined; throw e; });
  await g.__acc_schema;
  return sql;
}
