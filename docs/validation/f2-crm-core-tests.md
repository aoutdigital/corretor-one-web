# F2 - Validacao do CRM Core (schema + deduplicacao)

Este roteiro valida o que ja foi implementado na F2:
- tabelas CRM core
- politicas RLS owner-based
- regra de coerencia `negocio_id` x `lead_id`
- deduplicacao de leads por email e telefone (por owner)
- captura "find-or-update"

## Pre-requisitos
- `npm run dev` ativo
- `.env.local` contem:
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `LEADS_CAPTURE_API_KEY`
- migrations aplicadas:
  - `supabase/migrations/20260216195000_f2_crm_core_tables.sql`
  - `supabase/migrations/20260216202000_f2_leads_dedup_phone_and_capture_support.sql`

## 1) Validacao estrutural (SQL Editor)
Execute:
- `supabase/sql/f2_validation_queries.sql`

## 2) Captura de lead (create/update sem duplicar)
Use o mesmo payload duas vezes.

```bash
curl -i -X POST "http://localhost:3000/api/leads/capture" \
  -H "x-capture-key: <LEADS_CAPTURE_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "owner_id":"<UUID_DO_CORRETOR>",
    "nome":"Jose da Silva",
    "email":"jose@teste.com.br",
    "telefone":"+55 31 99999-0000",
    "telefone_e164":"+5531999990000",
    "origem":"CORRETOR_ONE",
    "mensagem":"Tenho interesse no imovel",
    "utm":{"source":"portal","campaign":"teste_f2"}
  }'
```

Esperado:
- 1a chamada: `{"ok":true,"data":{"action":"created",...}}`
- 2a chamada: `{"ok":true,"data":{"action":"updated",...}}`

## 3) Garantia de nao duplicacao por owner
No SQL Editor:

```sql
select owner_id, email_lower, count(*) as total
from public.leads
where email_lower is not null
group by owner_id, email_lower
having count(*) > 1;
```

```sql
select owner_id, telefone_e164, count(*) as total
from public.leads
where telefone_e164 is not null
group by owner_id, telefone_e164
having count(*) > 1;
```

Esperado:
- ambas consultas retornam 0 linhas

## 4) Teste de conflito de chaves cruzadas (opcional)
Se email e telefone apontarem para leads diferentes do mesmo owner, o endpoint retorna `409 CONFLICT`.
Isso evita merge implicito inseguro.

