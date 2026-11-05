-- Freedom Mobility NY Welcome Loop schema.
-- Run this yourself in a NEW Supabase project for Freedom. Do not point it at
-- the Rochester HealthTech project, and do not run it from this repository.
--
-- Stores a random visitor id, a stable holdout flag, the page path, the
-- referring host, and sanitized campaign fields. There is no email, name,
-- phone, message, user-agent, or IP column. Do not add those.

create extension if not exists pgcrypto;

create table if not exists public.welcome_visitors (
  visitor_id uuid primary key,
  holdout boolean not null,
  created_at timestamptz not null default now()
);

create table if not exists public.welcome_visits (
  id uuid primary key default gen_random_uuid(),
  visitor_id uuid not null references public.welcome_visitors (visitor_id),
  visited_at timestamptz not null default now(),
  page_path text not null,
  referrer_host text not null default '',
  utm_source text not null default '',
  utm_medium text not null default '',
  utm_campaign text not null default '',
  utm_content text not null default '',
  utm_term text not null default '',
  campaign_key text not null default '',
  constraint welcome_visits_page_path_len check (char_length(page_path) between 1 and 180),
  constraint welcome_visits_page_no_email check (position('@' in page_path) = 0),
  constraint welcome_visits_referrer_no_email check (position('@' in referrer_host) = 0),
  constraint welcome_visits_campaign_len check (char_length(campaign_key) <= 64)
);

create index if not exists welcome_visits_visitor_visited_idx
  on public.welcome_visits (visitor_id, visited_at desc);

create table if not exists public.welcome_variants (
  id uuid primary key,
  slot text not null,
  segment text not null,
  status text not null,
  copy jsonb not null,
  created_at timestamptz not null default now(),
  constraint welcome_variants_status check (status in ('draft', 'approved')),
  constraint welcome_variants_slot check (slot = 'hero'),
  constraint welcome_variants_segment check (segment ~ '^[a-z0-9][a-z0-9-]{0,63}$')
);

alter table public.welcome_visitors enable row level security;
alter table public.welcome_visits enable row level security;
alter table public.welcome_variants enable row level security;

-- No policies. anon and authenticated have no access. The PHP endpoint uses
-- the service role on the server, which bypasses RLS. Never put that key in
-- the Astro build or in a public repository.
revoke all on table public.welcome_visitors from anon, authenticated;
revoke all on table public.welcome_visits from anon, authenticated;
revoke all on table public.welcome_variants from anon, authenticated;

-- Retention is manual. Example, after you decide a window:
-- delete from public.welcome_visits where visited_at < now() - interval '90 days';
-- Do not schedule outreach from this table. It has no contact address.
