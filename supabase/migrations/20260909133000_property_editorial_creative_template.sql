insert into public.templates (
  nome, tipo, objetivo, provider, renderer_key, version, mode,
  formatos, preview_url, config, draft_config, ativo
)
values (
  'Imóvel Editorial 03', 'STATIC', 'PROMOVER_IMOVEL', 'HTML_STATIC',
  'property-editorial-03', 1, 'HYBRID',
  array['SQUARE', 'PORTRAIT', 'VERTICAL']::public.creative_output_format[],
  null,
  '{}'::jsonb,
  '{}'::jsonb,
  true
)
on conflict (renderer_key, version) do update
set nome = excluded.nome, formatos = excluded.formatos, ativo = true;
