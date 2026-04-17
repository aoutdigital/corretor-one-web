alter table public.propostas
  add column if not exists vencimento_em timestamptz null;

create index if not exists propostas_owner_vencimento_em_idx
  on public.propostas (owner_id, vencimento_em);
