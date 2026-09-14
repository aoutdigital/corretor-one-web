insert into public.templates (
  nome, tipo, objetivo, provider, renderer_key, version, mode, formatos,
  config, draft_config, preview_url, preview_vertical_url, ativo
)
select
  replacements.nome,
  source.tipo,
  'PROMOVER_EMPREENDIMENTO'::public.objetivo_template,
  source.provider,
  replacements.renderer_key,
  1,
  source.mode,
  source.formatos,
  source.config,
  null,
  null,
  null,
  true
from (
  values
    ('property-essential-01', 'Empreendimento Essencial 01', 'development-essential-01'),
    ('property-dual-02', 'Empreendimento Duas Perspectivas 02', 'development-dual-02'),
    ('property-editorial-03', 'Empreendimento Editorial 03', 'development-editorial-03'),
    ('property-journey-carousel-01', 'Carrossel Editorial Empreendimento 04', 'development-journey-carousel-01')
) as replacements(source_key, nome, renderer_key)
join public.templates source on source.renderer_key = replacements.source_key
where not exists (
  select 1 from public.templates existing
  where existing.renderer_key = replacements.renderer_key
);

create index if not exists templates_objetivo_ativo_nome_idx
  on public.templates (objetivo, ativo, nome);
