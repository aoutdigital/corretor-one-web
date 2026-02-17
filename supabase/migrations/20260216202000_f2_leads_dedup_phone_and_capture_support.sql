-- F2 - Leads dedup support by phone key
-- Rule: same owner cannot have duplicate telefone_e164 when present

create unique index if not exists leads_owner_telefone_e164_unique
  on public.leads (owner_id, telefone_e164)
  where telefone_e164 is not null;

