# F1.8 - Validacao Operacional (Nickname, CRECI, RLS)

Este roteiro valida no ambiente atual:
- regras de nickname
- regras de CRECI PF
- isolamento de acesso por usuario (RLS)

## Pre-requisitos
- App rodando local: `npm run dev`
- Usuario A autenticado e com token:
  - `export ACCESS_TOKEN_A='...'`
- Usuario B autenticado e com token (para teste de isolamento):
  - `export ACCESS_TOKEN_B='...'`
- Variaveis do projeto Supabase:
  - `export SUPABASE_URL='https://sfqiojnfmvolsrcailky.supabase.co'`
  - `export SUPABASE_ANON_KEY='...'`

## 1) Nickname valido/invalido

### 1.1 Valido (esperado: HTTP 200)
```bash
curl -i -X PATCH "http://localhost:3000/api/profile" \
  -H "Authorization: Bearer $ACCESS_TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{"nickname":"thiagomafort"}'
```

### 1.2 Invalido por regex (esperado: HTTP 400)
```bash
curl -i -X PATCH "http://localhost:3000/api/profile" \
  -H "Authorization: Bearer $ACCESS_TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{"nickname":"thiago_mafort"}'
```

### 1.3 Invalido por termo bloqueado (esperado: HTTP 400)
```bash
curl -i -X PATCH "http://localhost:3000/api/profile" \
  -H "Authorization: Bearer $ACCESS_TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{"nickname":"corretor123"}'
```

### 1.4 Imutabilidade (esperado: HTTP 400)
Depois de definir nickname valido, tentar trocar:
```bash
curl -i -X PATCH "http://localhost:3000/api/profile" \
  -H "Authorization: Bearer $ACCESS_TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{"nickname":"outro123"}'
```

## 2) CRECI valido/invalido

### 2.1 Valido (esperado: HTTP 200)
```bash
curl -i -X PATCH "http://localhost:3000/api/profile" \
  -H "Authorization: Bearer $ACCESS_TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{"creci_uf":"SP","creci_numero":"123456","creci_sufixo":"F"}'
```

### 2.2 Invalido (numero > 6 digitos) (esperado: HTTP 400)
```bash
curl -i -X PATCH "http://localhost:3000/api/profile" \
  -H "Authorization: Bearer $ACCESS_TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{"creci_numero":"1234567"}'
```

### 2.3 Invalido (sufixo diferente de F) (esperado: HTTP 400)
```bash
curl -i -X PATCH "http://localhost:3000/api/profile" \
  -H "Authorization: Bearer $ACCESS_TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{"creci_sufixo":"J"}'
```

## 3) Isolamento RLS por usuario autenticado

### 3.1 Capturar id do perfil do usuario A
```bash
curl -s "http://localhost:3000/api/profile" \
  -H "Authorization: Bearer $ACCESS_TOKEN_A"
```
Guarde `data.id` em:
```bash
export PROFILE_A_ID='uuid-do-usuario-a'
```

### 3.2 Usuario B tentando ler profile do A via REST do Supabase (esperado: lista vazia)
```bash
curl -s "$SUPABASE_URL/rest/v1/profiles?id=eq.$PROFILE_A_ID&select=id,email,nickname" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $ACCESS_TOKEN_B"
```
Esperado: `[]`

### 3.3 Usuario B tentando atualizar profile do A via REST (esperado: 0 linhas afetadas)
```bash
curl -i -X PATCH "$SUPABASE_URL/rest/v1/profiles?id=eq.$PROFILE_A_ID" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $ACCESS_TOKEN_B" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{"bio":"tentativa indevida"}'
```
Esperado: retorno sem linhas atualizadas (body `[]` ou equivalente).

## 4) Verificacao estrutural (SQL Editor)
Executar o arquivo:
- `supabase/sql/f1_8_validation_queries.sql`

