alter table public.leads
  add column if not exists form_key text,
  add column if not exists page_url text,
  add column if not exists referrer text,
  add column if not exists form_payload jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'leads_form_key_check'
      and conrelid = 'public.leads'::regclass
  ) then
    alter table public.leads
      add constraint leads_form_key_check
      check (
        form_key is null
        or form_key in ('whatsapp_contact', 'property_info', 'visit_schedule', 'curadoria')
      );
  end if;
end $$;

create index if not exists leads_owner_form_key_idx
  on public.leads (owner_id, form_key, updated_at desc);

create index if not exists leads_form_payload_gin_idx
  on public.leads using gin (form_payload);
