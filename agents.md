# Corretor.one — Agent Guide (source of truth)

## Stack
- Next.js (App Router) + TypeScript
- Supabase (Auth + Postgres)
- Vercel (deploy)

## Domains
- Portal público: corretor.one
- App (gestão do corretor): app.corretor.one

## Docs (SOURCE OF TRUTH)
Always read these before implementing anything:
- docs/rotas.md
- docs/data-model.md
- docs/enums.md

Rule: if implementation conflicts with docs, update docs first (or ask).

## Key product decisions
- Nickname do corretor: único, imutável, max 35 chars, apenas alfanumérico (sem espaço, acento, ç, ., _, hífen etc.)
- Bloquear nicknames com partes relacionadas ao mercado imobiliário (ex: corret, imob, imov, aparta, casa). Se tiver, apenas marcar como indisponível.
- CRECI: PF apenas. Formato: UF + até 6 dígitos + sufixo -F (ex: SP 123456-F). CRECI deve ser único.
- Briefing do portal reutiliza os mesmos enums do cadastro de imóvel (diferença só de UI/filtragem).

## Location APIs
- IBGE: estados/municípios. Baixar e persistir localmente (atualização manual quando necessário).
- Google Maps: geocoding e address_json para imóveis, empreendimentos, briefing e leads.

## Coding rules (IMPORTANT)
- Work in small, testable steps. One task per PR/commit.
- Don’t invent fields/enums. Use docs as the contract.
- Validate on backend (server actions / route handlers). Never trust only UI.
- Prefer typed DB access and keep Supabase types updated after schema changes.
- Never commit secrets (.env*).
- When changing DB schema, include:
  - migration SQL
  - indexes
  - constraints/uniques
  - updated types (or instructions to regenerate)
