drop policy if exists profile_artigos_config_select_public on public.profile_artigos_config;

create policy profile_artigos_config_select_public
  on public.profile_artigos_config
  for select
  using (true);
