-- V2: astrology/personal fields, contacts, DP, compatibility scoring

alter table leads
  add column if not exists date_of_birth date,
  add column if not exists time_of_birth text,
  add column if not exists place_of_birth text,
  add column if not exists rashi text,
  add column if not exists nakshatra text,
  add column if not exists nakshatra_padam text,
  add column if not exists religion text,
  add column if not exists caste text,
  add column if not exists gotra text,
  add column if not exists weight text,
  add column if not exists complexion text,
  add column if not exists father_name text,
  add column if not exists mother_name text,
  add column if not exists address text,
  add column if not exists profile_picture_url text,
  add column if not exists compatibility_score numeric,
  add column if not exists is_score_overridden boolean not null default false;

alter table leads
  add constraint leads_nakshatra_padam_check
  check (nakshatra_padam is null or nakshatra_padam in ('1', '2', '3', '4'));

create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  label text,
  phone_number text not null,
  created_at timestamptz not null default now()
);

create index if not exists contacts_lead_id_idx on contacts(lead_id);
alter table contacts enable row level security;
grant all privileges on table public.contacts to service_role;

-- Lookup keyed by the LEAD's own (nakshatra, padam) only — this app tracks
-- prospects for one fixed family member, so the score is precomputed
-- against that person's chart, not a pairwise nakshatra x nakshatra matrix.
create table if not exists nakshatra_scores (
  nakshatra text not null,
  padam text not null check (padam in ('1', '2', '3', '4')),
  score numeric,
  primary key (nakshatra, padam)
);

alter table nakshatra_scores enable row level security;
grant all privileges on table public.nakshatra_scores to service_role;
