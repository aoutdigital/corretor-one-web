-- F37 - Enum de visualização de endereço para anúncios de imóveis

begin;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'endereco_visualizacao_imovel') then
    create type public.endereco_visualizacao_imovel as enum (
      'END_SEM_COMPLEMENTO',
      'END_COMPLETO',
      'END_BAIRRO',
      'END_SEM_NUMERO'
    );
  end if;
end $$;

alter table public.imoveis
  add column if not exists enderecovisualizacao public.endereco_visualizacao_imovel not null default 'END_SEM_COMPLEMENTO';

alter table public.imoveis
  add column if not exists mostrar_complemento_no_anuncio boolean not null default false;

update public.imoveis
set enderecovisualizacao = case
  when ocultar_numero_publico = true then 'END_SEM_NUMERO'::public.endereco_visualizacao_imovel
  when coalesce(mostrar_complemento_no_anuncio, false) = true then 'END_COMPLETO'::public.endereco_visualizacao_imovel
  else 'END_SEM_COMPLEMENTO'::public.endereco_visualizacao_imovel
end
where enderecovisualizacao is null
   or enderecovisualizacao = 'END_SEM_COMPLEMENTO'::public.endereco_visualizacao_imovel;

commit;
