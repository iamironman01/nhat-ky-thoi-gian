-- Nhật ký thời gian: bảng đồng bộ dữ liệu
-- Dán toàn bộ vào Supabase > SQL Editor rồi bấm Run. Chạy lại nhiều lần cũng không sao.

create table if not exists public.nktg_items (
  user_id    uuid    not null default auth.uid() references auth.users(id) on delete cascade,
  kind       text    not null check (kind in ('type', 'entry', 'goal')),
  id         text    not null,
  data       jsonb,
  deleted    boolean not null default false,
  updated_at bigint  not null,                   -- lúc sửa trên thiết bị (mili giây)
  synced_at  timestamptz not null default now(), -- lúc máy chủ nhận
  primary key (user_id, kind, id)
);

create index if not exists nktg_items_user_synced on public.nktg_items (user_id, synced_at);

-- Mỗi người chỉ đọc/ghi được dữ liệu của chính mình
alter table public.nktg_items enable row level security;
drop policy if exists "nktg own rows" on public.nktg_items;
create policy "nktg own rows" on public.nktg_items for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Giữ bản sửa mới nhất, bỏ qua bản cũ hơn gửi đến muộn
create or replace function public.nktg_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.updated_at < old.updated_at then
    return old;
  end if;
  new.synced_at := clock_timestamp();
  return new;
end $$;

drop trigger if exists nktg_touch on public.nktg_items;
create trigger nktg_touch before insert or update on public.nktg_items
  for each row execute function public.nktg_touch();
