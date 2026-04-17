-- F21 - Seed manual: usuario em plano Autoridade anual + 5000 creditos Ayka avulsos

begin;

do $$
declare
  v_owner_id uuid := 'f682ca92-660b-40b9-b41b-33d8342b00c4';
  v_plano_id uuid;
  v_assinatura_id uuid;
  v_compra_ref text := 'MANUAL_20260222_UID_F682CA92_AUTORIDADE_ANUAL_5000_AVULSOS';
  v_now timestamptz := timezone('utc', now());
  v_inicio_em timestamptz := '2026-02-01 00:00:00+00';
  v_fim_em timestamptz := '2027-02-01 00:00:00+00';
  v_expira_avulso timestamptz := timezone('utc', now()) + interval '180 days';
begin
  if not exists (
    select 1
    from public.profiles
    where id = v_owner_id
  ) then
    raise exception 'Perfil % nao encontrado em public.profiles', v_owner_id;
  end if;

  select id
  into v_plano_id
  from public.planos
  where slug = 'autoridade'
  limit 1;

  if v_plano_id is null then
    raise exception 'Plano com slug=autoridade nao encontrado em public.planos';
  end if;

  insert into public.assinaturas (
    owner_id,
    plano_id,
    status,
    inicio_em,
    fim_em,
    stripe_current_period_end
  )
  values (
    v_owner_id,
    v_plano_id,
    'ATIVA',
    v_inicio_em,
    v_fim_em,
    v_fim_em
  )
  on conflict (owner_id) do update
  set
    plano_id = excluded.plano_id,
    status = excluded.status,
    inicio_em = excluded.inicio_em,
    fim_em = excluded.fim_em,
    cancelado_em = null,
    stripe_current_period_end = excluded.stripe_current_period_end
  returning id into v_assinatura_id;

  update public.profiles
  set plano_id = v_plano_id
  where id = v_owner_id;

  if not exists (
    select 1
    from public.ayka_creditos_lotes
    where owner_id = v_owner_id
      and origem = 'AVULSO'
      and compra_ref = v_compra_ref
  ) then
    insert into public.ayka_creditos_lotes (
      owner_id,
      origem,
      creditos_total,
      creditos_disponiveis,
      expira_em,
      compra_ref
    )
    values (
      v_owner_id,
      'AVULSO',
      5000,
      5000,
      v_expira_avulso,
      v_compra_ref
    );

    insert into public.ayka_movimentos (
      owner_id,
      mov_tipo,
      origem,
      acao_codigo,
      quantidade,
      custo_creditos,
      referencia_tipo,
      referencia_id,
      metadata
    )
    values (
      v_owner_id,
      'CREDITO',
      'AVULSO',
      'CARGA_MANUAL',
      5000,
      5000,
      'ASSINATURA',
      v_assinatura_id,
      jsonb_build_object(
        'compra_ref', v_compra_ref,
        'motivo', 'ajuste_manual',
        'executado_em', v_now
      )
    );
  end if;
end $$;

commit;
