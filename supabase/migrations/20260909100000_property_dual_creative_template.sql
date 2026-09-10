insert into public.templates (
  nome, tipo, objetivo, provider, renderer_key, version, mode,
  formatos, preview_url, config, draft_config, ativo
)
values (
  'Imóvel Duas Perspectivas 02',
  'STATIC',
  'PROMOVER_IMOVEL',
  'HTML_STATIC',
  'property-dual-02',
  1,
  'HYBRID',
  array['SQUARE', 'PORTRAIT', 'VERTICAL']::public.creative_output_format[],
  null,
  '{"formats":{"SQUARE":{"typography":{"title":{"color":"#ffffff"},"price":{"color":"#ffffff"}}},"PORTRAIT":{"typography":{"title":{"color":"#ffffff"},"price":{"color":"#ffffff"}}},"VERTICAL":{"typography":{"title":{"color":"#ffffff"},"price":{"color":"#ffffff"}}}}}'::jsonb,
  '{"formats":{"SQUARE":{"typography":{"title":{"color":"#ffffff"},"price":{"color":"#ffffff"}}},"PORTRAIT":{"typography":{"title":{"color":"#ffffff"},"price":{"color":"#ffffff"}}},"VERTICAL":{"typography":{"title":{"color":"#ffffff"},"price":{"color":"#ffffff"}}}}}'::jsonb,
  true
)
on conflict (renderer_key, version) do update
set nome = excluded.nome,
    formatos = excluded.formatos,
    config = excluded.config,
    draft_config = excluded.draft_config,
    ativo = true;
