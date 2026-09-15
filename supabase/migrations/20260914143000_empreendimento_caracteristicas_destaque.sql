alter table public.empreendimento_caracteristicas
  add column if not exists destaque boolean not null default false;

create index if not exists empreendimento_caracteristicas_destaque_idx
  on public.empreendimento_caracteristicas (empreendimento_id, caracteristica_id)
  where destaque = true;

create or replace function public.validar_limite_destaques_empreendimento()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  total_destaques integer;
begin
  if new.destaque is not true then
    return new;
  end if;

  select count(*)
    into total_destaques
    from public.empreendimento_caracteristicas ec
   where ec.empreendimento_id = new.empreendimento_id
     and ec.destaque = true
     and ec.caracteristica_id <> new.caracteristica_id;

  if total_destaques >= 6 then
    raise exception 'Um empreendimento pode ter no máximo 6 características em destaque.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists validar_limite_destaques_empreendimento
  on public.empreendimento_caracteristicas;

create trigger validar_limite_destaques_empreendimento
before insert or update of destaque, empreendimento_id
on public.empreendimento_caracteristicas
for each row
execute function public.validar_limite_destaques_empreendimento();
