
-- Roles enum + user_roles table (separate from any profile to prevent privilege escalation)
create type public.app_role as enum ('user', 'verified', 'moderator', 'admin');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

-- Anyone (including anon) can read roles to render verified badges
create policy "Roles are viewable by everyone"
on public.user_roles for select
using (true);

-- Only moderators can grant roles
create policy "Moderators can insert roles"
on public.user_roles for insert
to authenticated
with check (public.has_role(auth.uid(), 'moderator'));

create policy "Moderators can delete roles"
on public.user_roles for delete
to authenticated
using (public.has_role(auth.uid(), 'moderator'));

-- Comments
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  article_id text not null,
  user_id uuid references auth.users(id) on delete set null,
  author_display text not null check (char_length(author_display) between 1 and 60),
  body text not null check (char_length(body) between 1 and 1000),
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create index comments_article_idx on public.comments(article_id, created_at desc);

alter table public.comments enable row level security;

create policy "Anyone can read non-hidden comments"
on public.comments for select
using (hidden = false);

create policy "Authenticated users can post their own comments"
on public.comments for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can delete their own comments"
on public.comments for delete
to authenticated
using (auth.uid() = user_id);

create policy "Moderators can hide any comment"
on public.comments for update
to authenticated
using (public.has_role(auth.uid(), 'moderator'))
with check (public.has_role(auth.uid(), 'moderator'));

-- Votes (one per user per comment)
create table public.comment_votes (
  comment_id uuid references public.comments(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  verdict text not null check (verdict in ('real','fake')),
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

alter table public.comment_votes enable row level security;

create policy "Anyone can read vote tallies"
on public.comment_votes for select
using (true);

create policy "Authenticated users can cast their own vote"
on public.comment_votes for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can change their own vote"
on public.comment_votes for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can remove their own vote"
on public.comment_votes for delete
to authenticated
using (auth.uid() = user_id);
