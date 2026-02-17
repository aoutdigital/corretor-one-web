-- F1.3 - CRECI PF rules for profiles
-- Rules:
-- - unique (creci_uf, creci_numero, creci_sufixo) already created in F1.1
-- - creci_numero: 1 to 6 digits when provided
-- - creci_sufixo: must be 'F' when provided

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_creci_numero_format_ck'
  ) then
    alter table public.profiles
      add constraint profiles_creci_numero_format_ck
      check (
        creci_numero is null
        or creci_numero ~ '^[0-9]{1,6}$'
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_creci_sufixo_pf_ck'
  ) then
    alter table public.profiles
      add constraint profiles_creci_sufixo_pf_ck
      check (
        creci_sufixo is null
        or creci_sufixo = 'F'
      );
  end if;
end $$;

