-- Adds per-user data isolation to an EXISTING Working Set database
-- (one that was set up before auth existed, via the original schema.sql).
-- Run this once in the SQL Editor, AFTER you've enabled Email auth
-- (Authentication > Sign In / Providers > Email, with "Confirm email"
-- off is fine for magic links) — see the app's Section 8/README notes
-- for the two dashboard toggles to check first.
--
-- This clears existing rows rather than migrating them: they predate
-- auth entirely, so there's no user_id to attribute them to. That's
-- a handful of test workouts at this point, not real history worth
-- preserving — if you'd rather keep them, stop here and ask first.

delete from exercise_state;
delete from custom_exercises;
delete from workouts;
delete from settings;

alter table exercise_state add column user_id uuid references auth.users(id) on delete cascade;
alter table exercise_state alter column user_id set not null;
alter table exercise_state drop constraint exercise_state_pkey;
alter table exercise_state add primary key (user_id, id);

alter table custom_exercises add column user_id uuid references auth.users(id) on delete cascade;
alter table custom_exercises alter column user_id set not null;

alter table workouts add column user_id uuid references auth.users(id) on delete cascade;
alter table workouts alter column user_id set not null;
create index if not exists workouts_user_date_idx on workouts (user_id, date desc);
drop index if exists workouts_date_idx;

alter table settings drop constraint settings_pkey;
alter table settings drop column id;
alter table settings add column user_id uuid references auth.users(id) on delete cascade;
alter table settings alter column user_id set not null;
alter table settings add primary key (user_id);

drop policy "anon full access" on exercise_state;
drop policy "anon full access" on custom_exercises;
drop policy "anon full access" on workouts;
drop policy "anon full access" on settings;

create policy "own rows only" on exercise_state for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows only" on custom_exercises for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows only" on workouts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows only" on settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
