-- F70 - Public broker social proof.
-- Creates social proof moments for /[nickname], with owner CRUD and public read.
-- Images are published without watermark; consent is required when an image URL is present.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'prova_social_tipo') then
    create type public.prova_social_tipo as enum (
      'ENTREGA_CHAVES',
      'ASSINATURA_CONTRATO',
      'ASSINATURA_ESCRITURA',
      'DEPOIMENTO',
      'COMPRA_REALIZADA',
      'VENDA_REALIZADA',
      'LOCACAO_REALIZADA',
      'POS_VENDA'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'status_prova_social') then
    create type public.status_prova_social as enum (
      'RASCUNHO',
      'PUBLICADO',
      'ARQUIVADO'
    );
  end if;
end $$;

do $$
begin
  if exists (select 1 from pg_type where typname = 'ref_tipo')
    and not exists (
      select 1
      from pg_enum e
      join pg_type t on t.oid = e.enumtypid
      where t.typname = 'ref_tipo'
        and e.enumlabel = 'PROVA_SOCIAL'
    ) then
    alter type public.ref_tipo add value 'PROVA_SOCIAL' after 'EMPREENDIMENTO';
  end if;
end $$;

create table if not exists public.provas_sociais (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  midia_id uuid references public.midia (id) on delete set null,
  tipo public.prova_social_tipo not null,
  titulo text not null,
  descricao text,
  depoimento text,
  cliente_nome_publico text,
  localidade text,
  data_momento date,
  tags text[] not null default '{}',
  imagem_url text,
  imagem_alt text,
  consentimento_imagem_confirmado boolean not null default false,
  status public.status_prova_social not null default 'RASCUNHO',
  ordem int not null default 0,
  destaque boolean not null default false,
  publicado_em timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint provas_sociais_titulo_len_ck check (char_length(trim(titulo)) between 1 and 120),
  constraint provas_sociais_descricao_len_ck check (descricao is null or char_length(descricao) <= 260),
  constraint provas_sociais_depoimento_len_ck check (depoimento is null or char_length(depoimento) <= 520),
  constraint provas_sociais_cliente_nome_len_ck check (
    cliente_nome_publico is null or char_length(cliente_nome_publico) <= 80
  ),
  constraint provas_sociais_localidade_len_ck check (localidade is null or char_length(localidade) <= 120),
  constraint provas_sociais_imagem_alt_len_ck check (imagem_alt is null or char_length(imagem_alt) <= 180),
  constraint provas_sociais_publicacao_imagem_consentimento_ck check (
    status <> 'PUBLICADO'::public.status_prova_social
    or imagem_url is null
    or consentimento_imagem_confirmado = true
  )
);

create index if not exists provas_sociais_owner_status_ordem_idx
  on public.provas_sociais (owner_id, status, ordem, created_at desc);

create index if not exists provas_sociais_owner_destaque_idx
  on public.provas_sociais (owner_id, destaque, ordem);

create index if not exists provas_sociais_publicado_em_idx
  on public.provas_sociais (publicado_em desc);

drop trigger if exists trg_provas_sociais_set_updated_at on public.provas_sociais;
create trigger trg_provas_sociais_set_updated_at
before update on public.provas_sociais
for each row
execute function public.set_updated_at();

alter table public.provas_sociais enable row level security;

drop policy if exists provas_sociais_select_own on public.provas_sociais;
create policy provas_sociais_select_own
  on public.provas_sociais
  for select
  using (owner_id = auth.uid());

drop policy if exists provas_sociais_insert_own on public.provas_sociais;
create policy provas_sociais_insert_own
  on public.provas_sociais
  for insert
  with check (owner_id = auth.uid());

drop policy if exists provas_sociais_update_own on public.provas_sociais;
create policy provas_sociais_update_own
  on public.provas_sociais
  for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists provas_sociais_delete_own on public.provas_sociais;
create policy provas_sociais_delete_own
  on public.provas_sociais
  for delete
  using (owner_id = auth.uid());

drop policy if exists provas_sociais_public_read_published on public.provas_sociais;
create policy provas_sociais_public_read_published
  on public.provas_sociais
  for select
  using (
    status = 'PUBLICADO'::public.status_prova_social
    and exists (
      select 1
      from public.profiles p
      where p.id = provas_sociais.owner_id
        and p.status = 'ATIVO'::public.status_usuario
        and p.nickname is not null
    )
  );
