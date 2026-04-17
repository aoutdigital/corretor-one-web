-- F35 - Flag para exibir o número do andar no anúncio do imóvel

begin;

alter table public.imoveis
  add column if not exists mostrar_andar_no_anuncio boolean not null default false;

commit;
