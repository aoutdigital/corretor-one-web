-- f62_geolocacoes_rls.sql
-- Habilita RLS em geolocacoes e restringe acesso ao vínculo do usuário
-- com imóveis, empreendimentos, leads e briefings.

alter table public.geolocacoes enable row level security;

drop policy if exists geolocacoes_select_related on public.geolocacoes;
create policy geolocacoes_select_related
  on public.geolocacoes
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.imoveis
      where imoveis.geolocacao_id = geolocacoes.id
        and imoveis.owner_id = auth.uid()
    )
    or exists (
      select 1
      from public.empreendimentos
      where empreendimentos.geolocacao_id = geolocacoes.id
        and empreendimentos.owner_id = auth.uid()
    )
    or exists (
      select 1
      from public.lead_briefings
      where lead_briefings.geolocacao_id = geolocacoes.id
        and lead_briefings.owner_id = auth.uid()
    )
    or exists (
      select 1
      from public.lead_localizacoes_interesse
      where lead_localizacoes_interesse.geolocacao_id = geolocacoes.id
        and lead_localizacoes_interesse.owner_id = auth.uid()
    )
    or exists (
      select 1
      from public.user_briefings
      where user_briefings.geolocacao_id = geolocacoes.id
        and user_briefings.user_id = auth.uid()
    )
    or (
      coalesce(address_json ->> 'source', '') = 'IMOVEL_DRAFT_PLACEHOLDER'
      and coalesce(address_json ->> 'owner_id', '') = auth.uid()::text
    )
  );

drop policy if exists geolocacoes_insert_draft_own on public.geolocacoes;
create policy geolocacoes_insert_draft_own
  on public.geolocacoes
  for insert
  to authenticated
  with check (
    coalesce(address_json ->> 'source', '') = 'IMOVEL_DRAFT_PLACEHOLDER'
    and coalesce(address_json ->> 'owner_id', '') = auth.uid()::text
    and place_id = ('DRAFT_IMOVEL_' || auth.uid()::text)
  );
