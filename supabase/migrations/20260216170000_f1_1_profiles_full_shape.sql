-- F1.1 - Expand profiles shape to match docs/data-model.md
-- Keeps advanced business rules (nickname blocking, immutability, strict CRECI checks)
-- for dedicated steps F1.2 and F1.3.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'uf') then
    create type public.uf as enum (
      'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
      'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
      'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'genero') then
    create type public.genero as enum (
      'MASCULINO',
      'FEMININO',
      'NAO_INFORMAR'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'status_usuario') then
    create type public.status_usuario as enum (
      'ATIVO',
      'PENDENTE',
      'BLOQUEADO'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'papel_imobiliaria') then
    create type public.papel_imobiliaria as enum (
      'DONO',
      'ADMIN',
      'CORRETOR'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'status_dominio') then
    create type public.status_dominio as enum (
      'NAO_CONFIGURADO',
      'PENDENTE_VALIDACAO',
      'ATIVO',
      'SUSPENSO'
    );
  end if;
end $$;

alter table public.profiles
  add column if not exists genero public.genero,
  add column if not exists telefone text,
  add column if not exists whatsapp text,
  add column if not exists email_verificado_em timestamptz,
  add column if not exists whatsapp_verificado_em timestamptz,
  add column if not exists nickname text,
  add column if not exists avatar_url text,
  add column if not exists imagem_capa_url text,
  add column if not exists bio text,
  add column if not exists uf public.uf,
  add column if not exists cidades_foco text[],
  add column if not exists creci_uf public.uf,
  add column if not exists creci_numero text,
  add column if not exists creci_sufixo text default 'F',
  add column if not exists creci_documento_midia_id uuid,
  add column if not exists creci_aprovacao boolean not null default false,
  add column if not exists imoveis_residenciais boolean not null default true,
  add column if not exists imoveis_comerciais boolean not null default false,
  add column if not exists imoveis_industriais boolean not null default false,
  add column if not exists imoveis_alto_padrao boolean not null default false,
  add column if not exists imoveis_luxo boolean not null default false,
  add column if not exists imoveis_medio_padrao boolean not null default false,
  add column if not exists imoveis_baixa_renda boolean not null default false,
  add column if not exists instagram text,
  add column if not exists linkedin text,
  add column if not exists pinterest text,
  add column if not exists tiktok text,
  add column if not exists twitter text,
  add column if not exists youtube text,
  add column if not exists plano_id uuid,
  add column if not exists status public.status_usuario not null default 'PENDENTE',
  add column if not exists imobiliaria_id uuid,
  add column if not exists papel_imobiliaria public.papel_imobiliaria,
  add column if not exists dominio_custom text,
  add column if not exists dominio_status public.status_dominio not null default 'NAO_CONFIGURADO';

create unique index if not exists profiles_nickname_unique
  on public.profiles (nickname)
  where nickname is not null;

create unique index if not exists profiles_dominio_custom_unique
  on public.profiles (dominio_custom)
  where dominio_custom is not null;

create index if not exists profiles_uf_idx
  on public.profiles (uf);

create index if not exists profiles_status_idx
  on public.profiles (status);

create index if not exists profiles_creci_lookup_idx
  on public.profiles (creci_uf, creci_numero, creci_sufixo);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_creci_unique'
  ) then
    alter table public.profiles
      add constraint profiles_creci_unique
      unique (creci_uf, creci_numero, creci_sufixo);
  end if;
end $$;

do $$
begin
  if exists (select 1 from pg_class where relname = 'midia' and relnamespace = 'public'::regnamespace) then
    if not exists (
      select 1
      from pg_constraint
      where conname = 'profiles_creci_documento_midia_id_fkey'
    ) then
      alter table public.profiles
        add constraint profiles_creci_documento_midia_id_fkey
        foreign key (creci_documento_midia_id) references public.midia (id);
    end if;
  end if;
end $$;

do $$
begin
  if exists (select 1 from pg_class where relname = 'planos' and relnamespace = 'public'::regnamespace) then
    if not exists (
      select 1
      from pg_constraint
      where conname = 'profiles_plano_id_fkey'
    ) then
      alter table public.profiles
        add constraint profiles_plano_id_fkey
        foreign key (plano_id) references public.planos (id);
    end if;
  end if;
end $$;

do $$
begin
  if exists (select 1 from pg_class where relname = 'imobiliarias' and relnamespace = 'public'::regnamespace) then
    if not exists (
      select 1
      from pg_constraint
      where conname = 'profiles_imobiliaria_id_fkey'
    ) then
      alter table public.profiles
        add constraint profiles_imobiliaria_id_fkey
        foreign key (imobiliaria_id) references public.imobiliarias (id);
    end if;
  end if;
end $$;

