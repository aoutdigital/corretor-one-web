-- Public broker profile impact phrase.
-- Short user-editable headline for /[nickname], with backend length enforcement.

alter table public.profiles
  add column if not exists frase_impacto text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_frase_impacto_len_ck'
  ) then
    alter table public.profiles
      add constraint profiles_frase_impacto_len_ck
      check (
        frase_impacto is null
        or char_length(frase_impacto) <= 90
      );
  end if;
end $$;
