-- F1.8 - Structural validation queries (run on Supabase SQL Editor)

-- 1) Constraints de nickname e CRECI
select conname, pg_get_constraintdef(c.oid) as definition
from pg_constraint c
join pg_class t on t.oid = c.conrelid
where t.relname = 'profiles'
  and conname in (
    'profiles_nickname_format_ck',
    'profiles_nickname_blocked_terms_ck',
    'profiles_creci_unique',
    'profiles_creci_numero_format_ck',
    'profiles_creci_sufixo_pf_ck'
  )
order by conname;

-- 2) Triggers de nickname e separacao de papeis
select trigger_name, event_object_table, event_manipulation, action_timing
from information_schema.triggers
where event_object_schema = 'public'
  and trigger_name in (
    'trg_profiles_nickname_immutable',
    'trg_profiles_role_exclusive',
    'trg_portal_users_role_exclusive'
  )
order by trigger_name, event_manipulation;

-- 3) RLS habilitado em profiles e portal_users
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('profiles', 'portal_users')
order by tablename;

-- 4) Politicas de profiles e portal_users
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('profiles', 'portal_users')
order by tablename, policyname;

