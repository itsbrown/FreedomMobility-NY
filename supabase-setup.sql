-- Run this in your Supabase SQL Editor

create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  name text not null,
  phone text not null,
  email text not null,
  interest text,
  message text,
  status text default 'new' check (status in ('new', 'contacted', 'closed')),
  notes text
);

-- Enable Row Level Security
alter table submissions enable row level security;

-- Anyone can submit (insert)
create policy "Public can insert submissions"
  on submissions for insert
  to anon
  with check (true);

-- Only authenticated users (admins) can read
create policy "Authenticated users can view all submissions"
  on submissions for select
  to authenticated
  using (true);

-- Only authenticated users can update (for status/notes)
create policy "Authenticated users can update submissions"
  on submissions for update
  to authenticated
  using (true);

-- Optional: Allow authenticated to delete if needed
-- create policy "Authenticated users can delete submissions"
--   on submissions for delete
--   to authenticated
--   using (true);
