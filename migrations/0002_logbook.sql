create table if not exists logbook (
  id smallint primary key default 1,
  owner_id text,
  draft jsonb not null,
  published jsonb not null,
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  constraint logbook_singleton check (id = 1)
);

create table if not exists logbook_assets (
  id text primary key,
  owner_id text not null,
  mime text not null,
  data text not null,
  thumb text,
  width integer,
  height integer,
  bytes integer not null default 0,
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists logbook_assets_owner_idx on logbook_assets (owner_id);
