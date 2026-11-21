-- No extraction or AI is performed in Phase 1. Nullable metadata and the status
-- vocabulary let a later migration add tags, collections and a pgvector relation.
create table public.saved_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  original_url text not null check (char_length(original_url) between 1 and 2048 and original_url ~ '^https?://'),
  normalized_url text not null check (char_length(normalized_url) between 1 and 2048 and normalized_url ~ '^https?://'),
  platform text not null check (platform in ('youtube', 'instagram', 'x', 'whatsapp', 'website')),
  title text check (char_length(title) <= 200),
  description text check (char_length(description) <= 10000),
  processing_status text not null default 'saved'
    check (processing_status in ('saved', 'pending', 'processing', 'ready', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_document text generated always as (coalesce(title, '') || ' ' || original_url) stored,
  constraint saved_items_owner_url_key unique (user_id, normalized_url)
);

create index saved_items_owner_created_idx on public.saved_items (user_id, created_at desc, id desc);
create index saved_items_owner_platform_created_idx on public.saved_items (user_id, platform, created_at desc);

alter table public.saved_items enable row level security;
alter table public.saved_items force row level security;

revoke all on public.saved_items from anon, authenticated;
grant select, insert, update, delete on public.saved_items to authenticated;

create policy "Owners read saved items" on public.saved_items
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Owners insert saved items" on public.saved_items
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Owners update saved items" on public.saved_items
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Owners delete saved items" on public.saved_items
  for delete to authenticated using ((select auth.uid()) = user_id);

create function public.set_saved_item_updated_at()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function public.set_saved_item_updated_at() from public, anon, authenticated;

create trigger saved_items_updated_at before update on public.saved_items
  for each row execute function public.set_saved_item_updated_at();
