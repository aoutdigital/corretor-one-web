-- F2 - Structural validation queries

-- 1) Tabelas CRM core
select tablename
from pg_tables
where schemaname = 'public'
  and tablename in ('negocios', 'atividades', 'timeline_eventos', 'propostas')
order by tablename;

-- 2) Enum types do CRM core
select typname
from pg_type
where typname in (
  'finalidade',
  'etapa_negocio',
  'tipo_proposta',
  'status_proposta',
  'tipo_atividade',
  'status_atividade',
  'tipo_timeline'
)
order by typname;

-- 3) RLS habilitado
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('leads', 'negocios', 'atividades', 'timeline_eventos', 'propostas')
order by tablename;

-- 4) Policies owner-based
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('negocios', 'atividades', 'timeline_eventos', 'propostas')
order by tablename, policyname;

-- 5) Trigger de coerencia negocio/lead
select trigger_name, event_object_table, event_manipulation
from information_schema.triggers
where event_object_schema = 'public'
  and trigger_name in (
    'trg_atividades_negocio_lead_consistency',
    'trg_timeline_eventos_negocio_lead_consistency',
    'trg_propostas_negocio_lead_consistency'
  )
order by trigger_name, event_manipulation;

-- 6) Indices de deduplicacao de leads por owner
select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and indexname in (
    'leads_owner_email_lower_unique',
    'leads_owner_telefone_e164_unique'
  )
order by indexname;

-- 7) Constraint de desqualificacao em leads
select conname, pg_get_constraintdef(c.oid) as definition
from pg_constraint c
join pg_class t on t.oid = c.conrelid
where t.relname = 'leads'
  and conname = 'leads_motivo_desqualificacao_ck';

