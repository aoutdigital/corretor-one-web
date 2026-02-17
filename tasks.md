# Corretor.one — Backlog de Desenvolvimento (Docs-First)

Fonte de verdade:
- `docs/rotas.md`
- `docs/data-model.md`
- `docs/enums.md`
- `agents.md`

Regras gerais:
- [ ] Não implementar UI antes do backend do domínio estar fechado (schema, RLS, tipos e camada de acesso).
- [ ] Toda mudança de schema deve incluir migration, índices, constraints e políticas RLS.
- [ ] Não criar campos/enums fora dos docs; se necessário, atualizar docs primeiro.
- [ ] Manter tipagem Supabase atualizada após cada bloco de migrations.

## F0 — Setup e Governança
- [ ] Confirmar estrutura do projeto e docs obrigatórios.
- [ ] Padronizar estrutura de backend:
  - [ ] `src/lib/supabase/server.ts`
  - [ ] `src/lib/supabase/client.ts`
  - [ ] `src/lib/db/*` por domínio
- [ ] Definir convenção de migrations (`supabase/migrations/<timestamp>_<descricao>.sql`).

Critério de pronto (F0):
- [ ] Projeto roda localmente e padrão técnico está documentado.

## F1 — Identidade, Auth e Perfis (base de tudo)
- [x] F1.1 — Migration de `profiles` completa conforme `docs/data-model.md` (campos, defaults, constraints e índices).
- [x] F1.2 — Regras de nickname no banco:
  - [x] `unique` em `nickname`.
  - [x] `check` para regex `^[a-z0-9]{1,35}$`.
  - [x] bloqueio de substrings proibidas (`corret`, `imob`, `imov`, `aparta`, `casa`) via `check`.
  - [x] garantia de imutabilidade (trigger `before update` impedindo alteração).
- [x] F1.3 — Regras de CRECI PF no banco:
  - [x] `unique (creci_uf, creci_numero, creci_sufixo)`.
  - [x] `check` de `creci_numero` (1 a 6 dígitos).
  - [x] `check` de `creci_sufixo = 'F'`.
- [x] F1.4 — Separação de papéis:
  - [x] criar/ajustar `portal_users`.
  - [x] bloquear coexistência de usuário em `profiles` e `portal_users`.
- [x] F1.5 — RLS de identidade:
  - [x] `profiles`: usuário só lê/escreve o próprio registro.
  - [x] `portal_users`: usuário só lê/escreve o próprio registro.
- [x] F1.6 — Backend auth/profile (sem UI):
  - [x] função server-side para `ensureProfileOnFirstLogin`.
  - [x] endpoint/server action para atualizar perfil com validação backend.
  - [x] retorno de erro padronizado para violações de regra.
- [x] F1.7 — Tipos e camada de acesso:
  - [x] regenerar tipos Supabase após migrations.
  - [x] criar `lib/db/profiles.ts` com operações tipadas.
- [ ] F1.8 — Validação operacional:
  - [x] script/query de teste para nickname válido/inválido.
  - [x] script/query de teste para CRECI válido/inválido.
  - [ ] teste de isolamento RLS com usuário autenticado.

Critério de pronto (F1):
- [ ] Usuário autenticado consegue criar/manter apenas o próprio profile.
- [ ] Regras de nickname/CRECI validadas no backend.
- [ ] Fluxo de primeiro login garante profile sem depender de UI.

## F2 — CRM Core (backend primeiro)
- [x] Baseline inicial de CRM criado (`profiles`, `leads`, `lead_imoveis`, `lead_localizacoes_interesse`).
- [ ] Revisar e expandir `leads` conforme contrato final dos docs (inclusive campos de deduplicação e auditoria).
  - [x] deduplicação por `owner_id + email_lower` (parcial quando não nulo).
  - [x] deduplicação por `owner_id + telefone_e164` (parcial quando não nulo).
  - [x] endpoint de captura com estratégia find-or-update por chave de lead.
- [ ] Criar tabelas CRM complementares:
  - [x] `negocios`
  - [x] `atividades`
  - [x] `timeline_eventos`
  - [x] `propostas`
- [ ] Constraints críticas:
  - [x] `DESQUALIFICADO` exige `motivo_desqualificacao`.
  - [x] coerência entre `negocio_id` e `lead_id` em atividades/timeline (mesmo lead).
- [x] Índices para filtros e pipeline (owner, status/etapa, datas).
- [x] RLS completo por `owner_id` em todas as tabelas do CRM.

Critério de pronto (F2):
- [x] CRUD tipado de CRM funcionando em server-side sem UI.
- [ ] Segurança e consistência validadas por constraints/RLS.

## F3 — Camada Tipada de Dados
- [x] Gerar tipos Supabase após migrations.
- [ ] Implementar repositórios tipados:
  - [x] `lib/db/leads.ts`
  - [x] `lib/db/negocios.ts`
  - [x] `lib/db/atividades.ts`
  - [x] `lib/db/propostas.ts`
  - [x] `lib/db/timeline.ts`
- [x] Centralizar validações de entrada no backend (sem confiar na UI).

Critério de pronto (F3):
- [x] Operações críticas do CRM acessíveis por funções tipadas reutilizáveis.

## F4 — Imóveis e Empreendimentos (backend)
- [x] Implementar `imoveis` com constraints, índices e RLS por owner.
- [x] Implementar `empreendimentos` com constraints, índices e RLS por owner.
- [x] Garantir integrações de localização:
  - [x] `geolocacoes` (Google Maps snapshot + campos normalizados)
  - [x] relacionamento com imóveis/empreendimentos/leads.

Critério de pronto (F4):
- [x] CRUD backend de imóveis/empreendimentos pronto para consumo por UI e portal.

## F5 — Mídia (fundação)
- [x] Implementar `midia`, `midia_variantes`, `midia_relacoes`.
- [x] Definir abstração de storage (`SUPABASE` V1, pronto para expansão).
- [x] Implementar políticas de acesso por owner.

Critério de pronto (F5):
- [x] Upload e vínculo de mídia com entidades principais funcionando via backend.

## F6 — Portal Público e Usuário Portal (backend + rotas)
- [x] Implementar `portal_users`, `user_favoritos`, `user_follows`, `user_briefings`.
- [x] Aplicar regra de briefings reutilizando enums do cadastro de imóvel.
- [x] Garantir políticas públicas e privadas por rota:
  - [x] páginas públicas leem apenas dados publicados.
  - [x] rotas de conta exigem autenticação e escopo correto.

Critério de pronto (F6):
- [x] Dados públicos e privados segregados corretamente no backend.

## F7 — UI App (após backend estável)
- [x] App core:
  - [x] `/entrar`, `/criar-conta`, `/onboarding`, `/perfil`, `/configuracoes`
- [x] CRM:
  - [x] `/negocios`, `/lead/[id]`, `/lead/[id]/propostas/[proposta_id]`, `/negocios/atividades`
- [x] Imóveis/empreendimentos:
  - [x] listas, criação e edição com preview

Critério de pronto (F7):
- [x] Telas consomem apenas camada de dados tipada e regras já implementadas no backend.

## F8 — Portal Público e Admin UI
- [ ] Portal público (`/`, `/imoveis`, `/corretores`, `/{nickname}/*`) conforme `docs/rotas.md`.
- [ ] Admin interno (`admin.corretor.one/*`) conforme escopo definido nos docs.

Critério de pronto (F8):
- [ ] Navegação principal em produção com controle de acesso por papel.
