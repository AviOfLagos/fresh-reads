-- Votes table for article evidence (Real / Fake style, like comment_votes)
create table if not exists public.evidence_votes (
  evidence_id uuid not null references public.article_evidence(id) on delete cascade,
  user_id uuid not null,
  vote smallint not null check (vote in (-1, 1)),
  created_at timestamptz not null default now(),
  primary key (evidence_id, user_id)
);

alter table public.evidence_votes enable row level security;

create policy "Anyone can read evidence vote tallies"
  on public.evidence_votes for select
  to public
  using (true);

create policy "Authenticated users can cast their own evidence vote"
  on public.evidence_votes for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can change their own evidence vote"
  on public.evidence_votes for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can remove their own evidence vote"
  on public.evidence_votes for delete
  to authenticated
  using (auth.uid() = user_id);

create index if not exists idx_evidence_votes_evidence on public.evidence_votes(evidence_id);