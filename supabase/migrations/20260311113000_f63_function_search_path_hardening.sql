-- f63_function_search_path_hardening.sql
-- Endurece funções sinalizadas pelo linter do Supabase para evitar
-- search_path mutável em runtime.

alter function public.set_updated_at()
  set search_path = '';

alter function public.profiles_enforce_nickname_immutable()
  set search_path = '';

alter function public.enforce_user_role_exclusive()
  set search_path = '';

alter function public.check_negocio_matches_lead()
  set search_path = '';

alter function public.is_modelo_atividade_compativel(public.categoria_atividade, public.modelo_atividade)
  set search_path = '';
