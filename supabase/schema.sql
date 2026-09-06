-- Working Set — persistence schema (current, with per-user auth).
-- For a BRAND NEW Supabase project: run this file once in the SQL Editor.
-- For the existing project (tables already created without user_id):
-- run supabase/migration_001_add_auth.sql instead — this file won't
-- retroactively add columns to tables that already exist.
--
-- Design notes:
--   - Built-in exercises (~70) stay defined in code (src/WorkingSet.jsx); only their
--     dynamic history/PB lives here, keyed by the same id the code already uses
--     (e.g. "back0"). Custom exercises need their full definition stored, since
--     they don't exist in code.
--   - Every table is scoped by user_id (Supabase Auth, magic-link email) so two
--     people sharing this app never see each other's history/PB. RLS policies
--     restrict each row to its owner.

create table if not exists exercise_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,              -- matches the in-code exercise id
  history jsonb not null default '[]',  -- number[], capped at 8, most-recent last
  pb numeric,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists custom_exercises (
  id text primary key,          -- e.g. "custom_<timestamp>"
  user_id uuid not null references auth.users(id) on delete cascade,
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
  user_id uuid not null references auth.users(id) on delete cascade,
  date text not null,           -- "YYYY-MM-DD", local time (see brief section 6.12) — stored as text to avoid any DB-side timezone reinterpretation
  groups jsonb not null,        -- string[]
  dur_min integer not null,
  entries jsonb not null,       -- [{ id, name, kind, sets }]
  created_at timestamptz not null default now()
);
create index if not exists workouts_user_date_idx on workouts (user_id, date desc);

create table if not exists settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  rest_on boolean not null default false
);

alter table exercise_state enable row level security;
alter table custom_exercises enable row level security;
alter table workouts enable row level security;
alter table settings enable row level security;

create policy "own rows only" on exercise_state for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows only" on custom_exercises for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows only" on workouts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows only" on settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
