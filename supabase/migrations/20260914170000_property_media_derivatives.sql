-- Contrato de mídia responsiva para novos uploads de imóveis e empreendimentos.
-- Masters ficam privadas; cópias públicas mantêm variantes WebP com marca d'água.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'midia-private',
  'midia-private',
  false,
  52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

alter table public.imovel_midia_publica
  add column if not exists variantes jsonb not null default '{}'::jsonb;

alter table public.empreendimento_midia_publica
  add column if not exists variantes jsonb not null default '{}'::jsonb;

alter table public.imovel_midia_publica
  drop constraint if exists imovel_midia_publica_variantes_object_check;
alter table public.imovel_midia_publica
  add constraint imovel_midia_publica_variantes_object_check
  check (jsonb_typeof(variantes) = 'object');

alter table public.empreendimento_midia_publica
  drop constraint if exists empreendimento_midia_publica_variantes_object_check;
alter table public.empreendimento_midia_publica
  add constraint empreendimento_midia_publica_variantes_object_check
  check (jsonb_typeof(variantes) = 'object');

comment on column public.imovel_midia_publica.variantes is
  'Derivados públicos WebP W480, W768, W1024 e FULL_1920 com marca d agua.';
comment on column public.empreendimento_midia_publica.variantes is
  'Derivados públicos WebP W480, W768, W1024 e FULL_1920 com marca d agua.';
