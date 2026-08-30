-- Fix: service_role needs explicit table grants — RLS bypass alone doesn't
-- skip Postgres' base object privilege check.

grant usage on schema public to service_role;
grant all privileges on table public.leads to service_role;
grant all privileges on table public.attachments to service_role;
grant all privileges on table public.interactions to service_role;

alter default privileges in schema public grant all on tables to service_role;
