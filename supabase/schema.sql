-- AUX — fresh Supabase project schema
-- Run this file once in SQL Editor on a NEW project.

create extension if not exists pgcrypto;

create type public.music_provider as enum ('spotify','apple','deezer','youtube','manual');
create type public.post_type as enum ('review','memory');
create type public.post_visibility as enum ('public','followers','private');
create type public.notification_type as enum ('like','comment','follow','repost');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_.]{3,24}$'),
  display_name text not null check (char_length(display_name) between 1 and 60),
  bio text check (char_length(bio) <= 180),
  avatar_url text,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index profiles_username_lower_unique
on public.profiles (lower(username));

create table public.tracks (
  id uuid primary key default gen_random_uuid(),
  provider public.music_provider not null,
  provider_track_id text,
  title text not null check (char_length(title) between 1 and 300),
  artist text not null check (char_length(artist) between 1 and 300),
  album text check (char_length(album) <= 300),
  artwork_url text,
  source_url text not null,
  spotify_url text,
  apple_music_url text,
  deezer_url text,
  duration_ms integer check (duration_ms is null or duration_ms > 0),
  created_at timestamptz not null default now(),
  unique(provider, provider_track_id)
);

-- Up to five songs chosen by each user for their profile.
create table public.profile_top_tracks (
  user_id uuid not null references public.profiles(id) on delete cascade,
  track_id uuid not null references public.tracks(id) on delete cascade,
  position smallint not null check (position between 0 and 4),
  created_at timestamptz not null default now(),
  primary key(user_id, track_id),
  unique(user_id, position)
);


create table public.albums (
  id uuid primary key default gen_random_uuid(),
  provider public.music_provider not null,
  provider_album_id text,
  title text not null check (char_length(title) between 1 and 300),
  artist text not null check (char_length(artist) between 1 and 300),
  artwork_url text,
  source_url text not null,
  spotify_url text,
  apple_music_url text,
  deezer_url text,
  release_date date,
  total_tracks integer check (total_tracks is null or total_tracks > 0),
  created_at timestamptz not null default now(),
  unique(provider, provider_album_id)
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  track_id uuid references public.tracks(id) on delete restrict,
  album_id uuid references public.albums(id) on delete restrict,
  type public.post_type not null,
  body text not null check (char_length(body) between 1 and 4000),
  rating numeric(2,1),
  trend text check (char_length(trend) <= 40),
  visibility public.post_visibility not null default 'public',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint posts_subject_exactly_one check (
    num_nonnulls(track_id, album_id) = 1
  ),

  constraint album_posts_are_reviews check (
    album_id is null or type = 'review'
  ),

  constraint post_rating_rule check (
    (type='review' and rating between 0.5 and 5.0 and mod((rating*10)::int,5)=0)
    or (type='memory' and rating is null)
  )
);

create table public.post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  storage_path text not null,
  position smallint not null check (position between 0 and 5),
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  aspect_ratio numeric(8,4) check (aspect_ratio is null or aspect_ratio > 0),
  created_at timestamptz not null default now(),
  unique(post_id, position)
);

create table public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(follower_id, following_id),
  check(follower_id <> following_id)
);

create table public.likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(user_id, post_id)
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 800),
  parent_id uuid references public.comments(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reposts (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(user_id, post_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  type public.notification_type not null,
  post_id uuid references public.posts(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  check(recipient_id <> actor_id)
);

-- Future-ready lists: schema only; no P0 UI dependency.
create table public.lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check(char_length(name) between 1 and 100),
  description text check(char_length(description)<=500),
  cover_url text,
  visibility public.post_visibility not null default 'public',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.list_tracks (
  list_id uuid not null references public.lists(id) on delete cascade,
  track_id uuid not null references public.tracks(id) on delete cascade,
  position integer not null check(position>=0),
  added_at timestamptz not null default now(),
  primary key(list_id, track_id), unique(list_id, position)
);
create table public.list_likes (
  list_id uuid not null references public.lists(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(list_id,user_id)
);

create index posts_created_idx on public.posts(created_at desc);
create index posts_user_created_idx on public.posts(user_id, created_at desc);
create index posts_track_idx on public.posts(track_id, created_at desc);
create index posts_album_idx on public.posts(album_id, created_at desc);
create index albums_title_search_idx on public.albums(lower(title));
create index albums_artist_search_idx on public.albums(lower(artist));
create index comments_post_created_idx on public.comments(post_id, created_at);
create index notifications_recipient_created_idx on public.notifications(recipient_id, created_at desc);
create index follows_following_idx on public.follows(following_id);
create index likes_post_idx on public.likes(post_id);
create index reposts_post_idx on public.reposts(post_id);
create index tracks_title_search_idx on public.tracks(lower(title));
create index tracks_artist_search_idx on public.tracks(lower(artist));
create index profile_top_tracks_user_position_idx
on public.profile_top_tracks(user_id, position);


create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger posts_updated before update on public.posts for each row execute function public.set_updated_at();
create trigger comments_updated before update on public.comments for each row execute function public.set_updated_at();
create trigger lists_updated before update on public.lists for each row execute function public.set_updated_at();

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path=public as $$
declare base text; candidate text;
begin
  base := lower(regexp_replace(coalesce(new.raw_user_meta_data->>'username', split_part(coalesce(new.email,'user'),'@',1)), '[^a-zA-Z0-9_.]', '', 'g'));
  if char_length(base)<3 then base := 'auxuser'; end if;
  candidate := left(base,17) || '_' || left(replace(new.id::text,'-',''),6);
  insert into public.profiles(id,username,display_name) values(new.id,candidate,coalesce(new.raw_user_meta_data->>'display_name','novo no aux.'));
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.notify_post_action()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_id uuid;
  notification_kind public.notification_type;
  notification_comment_id uuid := null;
begin
  select p.user_id
  into owner_id
  from public.posts p
  where p.id = new.post_id;

  if owner_id is null then
    return new;
  end if;

  if owner_id = new.user_id then
    return new;
  end if;

  if tg_table_name = 'likes' then
    notification_kind := 'like';
  elsif tg_table_name = 'reposts' then
    notification_kind := 'repost';
  elsif tg_table_name = 'comments' then
    notification_kind := 'comment';
    notification_comment_id := new.id;
  else
    return new;
  end if;

  insert into public.notifications (
    recipient_id,
    actor_id,
    type,
    post_id,
    comment_id
  )
  values (
    owner_id,
    new.user_id,
    notification_kind,
    new.post_id,
    notification_comment_id
  );

  return new;
end;
$$;

create trigger likes_notify
after insert on public.likes
for each row
execute function public.notify_post_action();

create trigger reposts_notify
after insert on public.reposts
for each row
execute function public.notify_post_action();

create trigger comments_notify
after insert on public.comments
for each row
execute function public.notify_post_action();

-- Remove the notification when a like or repost is undone.
create or replace function public.remove_post_action_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  notification_kind public.notification_type;
begin
  if tg_table_name = 'likes' then
    notification_kind := 'like';
  elsif tg_table_name = 'reposts' then
    notification_kind := 'repost';
  else
    return old;
  end if;

  delete from public.notifications
  where actor_id = old.user_id
    and type = notification_kind
    and post_id = old.post_id;

  return old;
end;
$$;

create trigger likes_notification_cleanup
after delete on public.likes
for each row
execute function public.remove_post_action_notification();

create trigger reposts_notification_cleanup
after delete on public.reposts
for each row
execute function public.remove_post_action_notification();

create or replace function public.notify_follow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.follower_id <> new.following_id then
    insert into public.notifications(recipient_id, actor_id, type)
    values(new.following_id, new.follower_id, 'follow');
  end if;

  return new;
end;
$$;

create trigger follows_notify
after insert on public.follows
for each row
execute function public.notify_follow();

-- Remove the notification when someone unfollows.
create or replace function public.remove_follow_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.notifications
  where recipient_id = old.following_id
    and actor_id = old.follower_id
    and type = 'follow';

  return old;
end;
$$;

create trigger follows_notification_cleanup
after delete on public.follows
for each row
execute function public.remove_follow_notification();

alter table public.profiles enable row level security;
alter table public.tracks enable row level security;
alter table public.albums enable row level security;
alter table public.profile_top_tracks enable row level security;
alter table public.posts enable row level security;
alter table public.post_media enable row level security;
alter table public.follows enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;
alter table public.reposts enable row level security;
alter table public.notifications enable row level security;
alter table public.lists enable row level security;
alter table public.list_tracks enable row level security;
alter table public.list_likes enable row level security;

create policy profiles_read on public.profiles for select using(true);
create policy profiles_update_own on public.profiles for update using(auth.uid()=id) with check(auth.uid()=id);

create policy tracks_read on public.tracks for select using(true);
create policy tracks_insert_auth on public.tracks for insert to authenticated with check(auth.uid() is not null);

create policy albums_read
on public.albums
for select
using(true);

create policy albums_insert_auth
on public.albums
for insert
to authenticated
with check(auth.uid() is not null);

create policy profile_top_tracks_read
on public.profile_top_tracks
for select
using(true);

create policy profile_top_tracks_insert_own
on public.profile_top_tracks
for insert
to authenticated
with check(user_id=auth.uid());

create policy profile_top_tracks_update_own
on public.profile_top_tracks
for update
to authenticated
using(user_id=auth.uid())
with check(user_id=auth.uid());

create policy profile_top_tracks_delete_own
on public.profile_top_tracks
for delete
to authenticated
using(user_id=auth.uid());

create policy posts_read on public.posts for select using(
 visibility='public' or user_id=auth.uid() or (visibility='followers' and exists(select 1 from public.follows f where f.follower_id=auth.uid() and f.following_id=user_id))
);
create policy posts_insert_own on public.posts for insert to authenticated with check(user_id=auth.uid());
create policy posts_update_own on public.posts for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy posts_delete_own on public.posts for delete to authenticated using(user_id=auth.uid());

create policy media_read on public.post_media for select using(exists(select 1 from public.posts p where p.id=post_id and (p.visibility='public' or p.user_id=auth.uid() or (p.visibility='followers' and exists(select 1 from public.follows f where f.follower_id=auth.uid() and f.following_id=p.user_id)))));
create policy media_insert_own on public.post_media for insert to authenticated with check(exists(select 1 from public.posts p where p.id=post_id and p.user_id=auth.uid()));
create policy media_update_own on public.post_media for update to authenticated using(exists(select 1 from public.posts p where p.id=post_id and p.user_id=auth.uid()));
create policy media_delete_own on public.post_media for delete to authenticated using(exists(select 1 from public.posts p where p.id=post_id and p.user_id=auth.uid()));

create policy follows_read on public.follows for select using(true);
create policy follows_insert_own on public.follows for insert to authenticated with check(follower_id=auth.uid() and following_id<>auth.uid());
create policy follows_delete_own on public.follows for delete to authenticated using(follower_id=auth.uid());
create policy likes_read on public.likes for select using(true);
create policy likes_insert_own on public.likes for insert to authenticated with check(user_id=auth.uid());
create policy likes_delete_own on public.likes for delete to authenticated using(user_id=auth.uid());
create policy comments_read on public.comments for select using(exists(select 1 from public.posts p where p.id=post_id and (p.visibility='public' or p.user_id=auth.uid() or (p.visibility='followers' and exists(select 1 from public.follows f where f.follower_id=auth.uid() and f.following_id=p.user_id)))));
create policy comments_insert_own on public.comments for insert to authenticated with check(user_id=auth.uid());
create policy comments_update_own on public.comments for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy comments_delete_own on public.comments for delete to authenticated using(user_id=auth.uid());
create policy reposts_read on public.reposts for select using(true);
create policy reposts_insert_own
on public.reposts
for insert
to authenticated
with check (
  user_id = auth.uid()
  and not exists (
    select 1
    from public.posts p
    where p.id = post_id
      and p.user_id = auth.uid()
  )
);
create policy reposts_delete_own on public.reposts for delete to authenticated using(user_id=auth.uid());
create policy notifications_read_own on public.notifications for select to authenticated using(recipient_id=auth.uid());
create policy notifications_update_own on public.notifications for update to authenticated using(recipient_id=auth.uid()) with check(recipient_id=auth.uid());

create policy lists_read on public.lists for select using(visibility='public' or user_id=auth.uid());
create policy lists_write_own on public.lists for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy list_tracks_read on public.list_tracks for select using(exists(select 1 from public.lists l where l.id=list_id and (l.visibility='public' or l.user_id=auth.uid())));
create policy list_tracks_write on public.list_tracks for all to authenticated using(exists(select 1 from public.lists l where l.id=list_id and l.user_id=auth.uid())) with check(exists(select 1 from public.lists l where l.id=list_id and l.user_id=auth.uid()));
create policy list_likes_read on public.list_likes for select using(true);
create policy list_likes_insert on public.list_likes for insert to authenticated with check(user_id=auth.uid());
create policy list_likes_delete on public.list_likes for delete to authenticated using(user_id=auth.uid());

-- Public reads are intentional for P0 public profiles/posts. Uploads are scoped to auth.uid() folders.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
('avatars','avatars',true,5242880,array['image/jpeg','image/png','image/webp','image/heic']),
('memories','memories',true,10485760,array['image/jpeg','image/png','image/webp','image/heic'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create policy storage_insert_own on storage.objects for insert to authenticated with check(bucket_id in ('avatars','memories') and (storage.foldername(name))[1]=auth.uid()::text);
create policy storage_update_own on storage.objects for update to authenticated using(bucket_id in ('avatars','memories') and (storage.foldername(name))[1]=auth.uid()::text) with check((storage.foldername(name))[1]=auth.uid()::text);
create policy storage_delete_own on storage.objects for delete to authenticated using(bucket_id in ('avatars','memories') and (storage.foldername(name))[1]=auth.uid()::text);

-- Explainable P0 ranking: recency + light social proof + affinity to followed authors.
create or replace function public.get_for_you_post_ids(p_limit integer default 40)
returns table(post_id uuid, score double precision)
language sql stable security invoker set search_path=public as $$
  select p.id,
    greatest(0, 4.0 - extract(epoch from (now()-p.created_at))/21600.0)
    + (select count(*) from public.likes l where l.post_id=p.id) * 0.08
    + (select count(*) from public.comments c where c.post_id=p.id) * 0.18
    + (select count(*) from public.reposts r where r.post_id=p.id) * 0.22
    + case when exists(select 1 from public.follows f where f.follower_id=auth.uid() and f.following_id=p.user_id) then 1.8 else 0 end as score
  from public.posts p
  where p.visibility='public'
  order by score desc, p.created_at desc
  limit least(greatest(p_limit,1),100);
$$;
grant execute on function public.get_for_you_post_ids(integer) to anon, authenticated;
