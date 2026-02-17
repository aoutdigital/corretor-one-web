-- F1.2 - Nickname rules for profiles
-- Rules:
-- - unique nickname already exists (partial unique index)
-- - regex: ^[a-z0-9]{1,35}$
-- - blocked substrings: corret, imob, imov, aparta, casa
-- - immutable after first set

create or replace function public.profiles_enforce_nickname_immutable()
returns trigger
language plpgsql
as $$
begin
  if old.nickname is not null and new.nickname is distinct from old.nickname then
    raise exception 'nickname is immutable once set';
  end if;

  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_nickname_format_ck'
  ) then
    alter table public.profiles
      add constraint profiles_nickname_format_ck
      check (
        nickname is null
        or nickname ~ '^[a-z0-9]{1,35}$'
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_nickname_blocked_terms_ck'
  ) then
    alter table public.profiles
      add constraint profiles_nickname_blocked_terms_ck
      check (
        nickname is null
        or nickname !~* '(corret|imob|imov|aparta|casa)'
      );
  end if;
end $$;

drop trigger if exists trg_profiles_nickname_immutable on public.profiles;
create trigger trg_profiles_nickname_immutable
before update on public.profiles
for each row
execute function public.profiles_enforce_nickname_immutable();

