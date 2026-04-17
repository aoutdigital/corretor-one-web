-- F34 - Vinculo do imovel com tipo de empreendimento selecionado no multistep

begin;

alter table public.imoveis
  add column if not exists empreendimento_tipo_id uuid references public.empreendimento_tipos (id) on delete set null;

alter table public.imoveis
  add column if not exists empreendimento_tipologia_label text;

create index if not exists imoveis_empreendimento_tipo_id_idx
  on public.imoveis (empreendimento_tipo_id);

commit;
