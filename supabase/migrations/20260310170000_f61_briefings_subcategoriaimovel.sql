do $$
begin
  if not exists (select 1 from pg_type where typname = 'objetivo_lead') then
    create type public.objetivo_lead as enum (
      'COMPRAR',
      'ALUGAR',
      'VENDER'
    );
  end if;
end $$;

alter table public.user_briefings
  add column if not exists subcategoriaimovel text[] null;
alter table public.user_briefings
  add column if not exists objetivolead public.objetivo_lead[] null;

alter table public.lead_briefings
  add column if not exists subcategoriaimovel text[] null;
alter table public.lead_briefings
  add column if not exists objetivolead public.objetivo_lead[] null;

update public.user_briefings
set objetivolead = nullif(
  array_remove(
    array[
      case when tiponegociacao @> array['VENDA'::public.tipo_negociacao] then 'COMPRAR'::public.objetivo_lead end,
      case when tiponegociacao @> array['ALUGUEL'::public.tipo_negociacao] then 'ALUGAR'::public.objetivo_lead end
    ]::public.objetivo_lead[],
    null
  ),
  '{}'::public.objetivo_lead[]
)
where objetivolead is null
  and tiponegociacao is not null;

update public.lead_briefings
set objetivolead = nullif(
  array_remove(
    array[
      case when tiponegociacao @> array['VENDA'::public.tipo_negociacao] then 'COMPRAR'::public.objetivo_lead end,
      case when tiponegociacao @> array['ALUGUEL'::public.tipo_negociacao] then 'ALUGAR'::public.objetivo_lead end
    ]::public.objetivo_lead[],
    null
  ),
  '{}'::public.objetivo_lead[]
)
where objetivolead is null
  and tiponegociacao is not null;
