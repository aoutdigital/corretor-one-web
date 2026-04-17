-- F36 - Controle de exibição do complemento do endereço no anúncio do imóvel

begin;

alter table public.imoveis
  add column if not exists mostrar_complemento_no_anuncio boolean not null default false;

commit;
