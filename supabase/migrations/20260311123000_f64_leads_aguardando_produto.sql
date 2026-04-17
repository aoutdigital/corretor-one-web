alter table public.leads
  add column if not exists aguardando_produto boolean not null default false;

update public.leads
set motivo_desqualificacao = 'OUTRO'
where status = 'DESQUALIFICADO'
  and motivo_desqualificacao is null;

update public.leads
set motivo_desqualificacao = null
where status <> 'DESQUALIFICADO'
  and motivo_desqualificacao is not null;

alter table public.leads
  drop constraint if exists leads_motivo_desqualificacao_consistente;

alter table public.leads
  add constraint leads_motivo_desqualificacao_consistente
  check (
    (status = 'DESQUALIFICADO' and motivo_desqualificacao is not null)
    or (status <> 'DESQUALIFICADO' and motivo_desqualificacao is null)
  );

create index if not exists leads_owner_aguardando_produto_idx
  on public.leads (owner_id, aguardando_produto, status, updated_at desc);
