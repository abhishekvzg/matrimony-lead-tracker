-- Matrimony Lead Tracker — initial schema
-- Run this in the Supabase SQL editor (or via `supabase db push`).

create extension if not exists pgcrypto;

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  name text,
  age int,
  height text,
  education text,
  profession text,
  location text,
  income text,
  father_occupation text,
  mother_occupation text,
  siblings text,
  other_details text,
  source text,
  status text not null default 'New',
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table leads
  add constraint leads_status_check check (status in (
    'New', 'Reviewing', 'Contacted', 'In Discussion', 'Meeting Planned',
    'Meeting Done', 'On Hold', 'Rejected', 'Rejected by Other Side'
  ));

create table if not exists attachments (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  file_url text not null,
  file_name text,
  uploaded_at timestamptz not null default now()
);

create table if not exists interactions (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  interaction_date date not null default current_date,
  spoke_by text not null,
  notes text,
  created_at timestamptz not null default now()
);

alter table interactions
  add constraint interactions_spoke_by_check check (spoke_by in (
    'Dad', 'Mom', 'Sister', 'You', 'Other'
  ));

create index if not exists attachments_lead_id_idx on attachments(lead_id);
create index if not exists interactions_lead_id_idx on interactions(lead_id);
create index if not exists leads_archived_idx on leads(archived);

-- Keep updated_at current on every update.
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists leads_set_updated_at on leads;
create trigger leads_set_updated_at
  before update on leads
  for each row
  execute function set_updated_at();

-- This app talks to Supabase only via the server-side service role key,
-- so row level security stays enabled with no public policies (default-deny).
alter table leads enable row level security;
alter table attachments enable row level security;
alter table interactions enable row level security;

-- Storage bucket for lead attachments (private; the app serves files via
-- signed URLs generated with the service role key).
insert into storage.buckets (id, name, public)
values ('lead-attachments', 'lead-attachments', false)
on conflict (id) do nothing;
