# sms_sender (Supabase Edge Function)

Funcao para envio de codigo OTP por SMS/WhatsApp com suporte a multiplos provedores.

## Provider atual

- `smtp2go`

## Payload (POST)

```json
{
  "phone": "+55 31 99999-0000",
  "user_tipo": "CORRETOR",
  "user_id": "uuid-do-user",
  "provider": "smtp2go"
}
```

Campos obrigatorios:

- `phone`
- `user_tipo` (`PORTAL` | `CORRETOR`)
- `user_id`

Campo opcional:

- `provider` (hoje: `smtp2go`; se omitido usa `SMS_PROVIDER_DEFAULT`)

## Variaveis de ambiente (Supabase secrets)

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SMTP2GO_API_KEY`
- `SMS_PROVIDER_DEFAULT` (opcional, default: `smtp2go`)

## Tabela usada

- `public.verificacoes_contato`

Colunas usadas no insert:

- `user_tipo`
- `user_id`
- `canal` (`WHATSAPP`)
- `destino` (telefone em E.164)
- `codigo_hash` (SHA-256 do OTP)
- `expira_em` (+10 minutos)
- `tentativas`
- `status` (`PENDENTE`)
- `enviado_em`

## Exemplo de chamada

```bash
curl -i -X POST "https://<PROJECT_REF>.supabase.co/functions/v1/sms_sender" \
  -H "Authorization: Bearer <SUPABASE_ANON_OR_USER_JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "phone":"+55 31 99999-0000",
    "user_tipo":"CORRETOR",
    "user_id":"00000000-0000-0000-0000-000000000000",
    "provider":"smtp2go"
  }'
```

## Seguranca

- Nao hardcode API keys no codigo.
- Se qualquer chave ja foi exposta, faca rotacao imediata no provedor.
