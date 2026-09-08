-- Adds a user-configurable default rest duration, replacing the fixed
-- per-exercise rest time as the source of truth for the timer. Run once
-- in the SQL Editor.

alter table settings add column if not exists rest_seconds integer not null default 90;
