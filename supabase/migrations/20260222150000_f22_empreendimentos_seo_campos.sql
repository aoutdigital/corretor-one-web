-- F22 - Campos SEO para empreendimentos

begin;

alter table public.empreendimentos
  add column if not exists resumo_curto text,
  add column if not exists meta_title text,
  add column if not exists meta_description text,
  add column if not exists keywords text[] not null default '{}'::text[];

create index if not exists empreendimentos_meta_title_idx
  on public.empreendimentos (meta_title)
  where meta_title is not null;

commit;
