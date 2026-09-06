-- Working Set — Phase 2 persistence schema.
-- Run this once in your Supabase project's SQL Editor (Project > SQL Editor > New query).
--
-- Design notes:
--   - Built-in exercises (~70) stay defined in code (src/WorkingSet.jsx); only their
--     dynamic history/PB lives here, keyed by the same id the code already uses
--     (e.g. "back0"). Custom exercises need their full definition stored, since
--     they don't exist in code.
--   - No auth yet (single user, per the brief) — RLS is enabled with permissive
--     policies for the anon key rather than left disabled, so the dashboard
--     doesn't flag the tables as unrestricted. Tighten this when a friend joins.

create table if not exists exercise_state (
  id text primary key,              -- matches the in-code exercise id
  history jsonb not null default '[]',  -- number[], capped at 8, most-recent last
  pb numeric,
  updated_at timestamptz not null default now()
);

create table if not exists custom_exercises (
  id text primary key,              -- e.g. "custom_<timestamp>"
  group_id text not null,
  kind text not null check (kind in ('weight', 'cardio')),
  name text not null,
  min numeric not null,
  max numeric not null,
  step numeric not null,
  reps integer not null default 0,
  rest integer not null default 0,
  start numeric,
  cues jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create table if not exists workouts (
  id uuid primary key default gen_random_uuid(),
  date text not null,               -- "YYYY-MM-DD", local time (see brief section 6.12) — stored as text to avoid any DB-side timezone reinterpretation
  groups jsonb not null,            -- string[]
  dur_min integer not null,
  entries jsonb not null,           -- [{ id, name, kind, sets }]
  created_at timestamptz not null default now()
);
create index if not exists workouts_date_idx on workouts (date desc);

create table if not exists settings (
  id text primary key default 'default',
  rest_on boolean not null default false
);
insert into settings (id, rest_on) values ('default', false)
  on conflict (id) do nothing;

alter table exercise_state enable row level security;
alter table custom_exercises enable row level security;
alter table workouts enable row level security;
alter table settings enable row level security;

create policy "anon full access" on exercise_state for all using (true) with check (true);
create policy "anon full access" on custom_exercises for all using (true) with check (true);
create policy "anon full access" on workouts for all using (true) with check (true);
create policy "anon full access" on settings for all using (true) with check (true);
