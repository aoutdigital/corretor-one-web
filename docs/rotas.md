# Lousa — Rotas (Corretor.one)

> Escopo: **todas as páginas/rotas** do Portal, páginas públicas do Corretor, App e Admin.

---

## 1) Portal Público (corretor.one)

### Principais
- **/** — Página inicial (valor do produto, CTAs, corretores em destaque, imóveis em destaque, depoimentos)
- **/imoveis/** — Listagem de imóveis de todos os corretores
- **/corretores/** — Listagem de corretores
- **/planos/** — Planos
- **/artigos/** — Artigos (listagem)
- **/artigos/[slug]/** — Artigo (item)

### Usuário do Portal (público + logado)
- **/entrar/** — Login do portal
- **/criar-conta/** — Cadastro do portal
- **/conta/** — Meu perfil
- **/conta/favoritos/** — Imóveis favoritados
- **/conta/seguindo/** — Corretores seguidos
- **/conta/preferencias/** — Preferências gerais + canais (email/whatsapp)
- **/conta/briefings/** — Briefings (geral + por corretor)
  - **Geral**: recomendações do portal e de corretores seguidos
  - **Por corretor**: preferências específicas por corretor

### Institucionais
- **/termos** — Termos de uso
- **/privacidade** — Política de privacidade

### Imobiliárias (futuro — fora do portal)
- O domínio **corretor.one** permanece **exclusivo para corretores**.
- Imobiliárias podem ter **portais próprios** (fora do corretor.one), sem rotas públicas no portal.

---

## 2) Páginas Públicas do Corretor (corretor.one/[nickname])

> Observação: todas as rotas abaixo ficam sob o namespace do corretor.

- **/[nickname]/** — Perfil do corretor

### Empreendimentos
- **/[nickname]/empreendimentos/** — Listagem de empreendimentos
- **/[nickname]/[slugEmpreendimento]/** — Página do empreendimento

### Captação
- **/[nickname]/anuncie/** — Página de captação (captar imóveis)

### Imóveis (público)
- **/[nickname]/imoveis/** — Estoque / listagem de imóveis do corretor
- **/[nickname]/venda/[slugImovel]/** — Imóvel à venda
- **/[nickname]/aluguel/[slugImovel]/** — Imóvel para locação

### Landing Pages e Conteúdo
- **/[nickname]/lp/[slug]/** — Landing page do corretor
- **/[nickname]/artigos/** — Artigos do corretor (listagem)
- **/[nickname]/artigos/[slug]/** — Artigo do corretor (item)

---

## 3) App (Autenticado — app.corretor.one)

### Core
- **/entrar** — Login
- **/criar-conta** — Cadastro
- **/recuperar-senha** — Recuperar senha
- **/onboarding** — Wizard inicial
- **/** — Home (resumo)
- **/perfil** — Meu perfil
- **/configuracoes** — Configurações
- **/assinatura** — Plano e cobrança

### App — Imóveis
- **/imoveis** — Lista
- **/imoveis/novo** — Criar
- **/imoveis/[id]** — **Edição + Preview** (tela de edição + bloco de resumo + botão p/ página pública)

### App — Empreendimentos
- **/empreendimentos** — Lista
- **/empreendimentos/novo** — Criar
- **/empreendimentos/[id]** — **Edição + Preview**

### App — Mídia
- **/midia** — Biblioteca

### App — CRM (Negócios)
- **/negocios** — Pipeline (Kanban) + Listagem (filtros)
- **/lead/[id]** — Lead (detalhe + timeline)
- **/lead/[id]/propostas/[proposta_id]** — Proposta
- **/negocios/atividades** — Atividades
- **/negocios/calendario** — Calendário

### App — Leads (opcional / alias)
- **/leads** — Lista (pode ser alias de /negocios)
- **/leads/novo** — Criar manual
- **/leads/[id]** — Detalhe

### App — Listas/Seleções
- **/listas** — Lista
- **/listas/nova** — Criar
- **/listas/[id]** — Detalhe
- **/listas/[id]/editar** — Editar

### App — Marketing
#### Criativos
- **/templates** — Biblioteca de templates disponíveis
- **/posts** — Histórico de criativos gerados
- **/posts/[id]** — Preview, download e compartilhamento

#### Email Marketing
- **/campanhas/email** — Lista de campanhas
- **/campanhas/email/nova** — Criar campanha (fluxo guiado)
- **/campanhas/email/[id]** — Detalhe + métricas

#### WhatsApp (disparo em massa)
- **/campanhas/whatsapp** — Lista de disparos
- **/campanhas/whatsapp/nova** — Criar disparo
- **/campanhas/whatsapp/[id]** — Status + métricas

#### Público / Audiência
- **/audiencia/seguidores** — Seguidores captados
- **/audiencia/listas** — Listas segmentadas
- **/audiencia/listas/[id]** — Gerenciar contatos da lista

#### Ayka
- **/ayka** — Saldo, consumo e histórico
- **/ayka/comprar** — Comprar créditos avulsos
- **/ayka/gamificacao** — Recompensas (futuro)

---

## 4) Admin (Interno — equipe Corretor.one)

- **admin.corretor.one/** — Dashboard

### Papéis
- **ADM** — gestão de corretores, planos, financeiro, suporte, visão global
- **MARKETING** — artigos do portal, landing pages institucionais, templates

### Admin — Corretores
- **/corretores**
- **/corretores/[id]**

### Admin — Imóveis
- **/imoveis**
- **/imoveis/[id]**

### Admin — Templates
- **/templates**
- **/templates/novo**
- **/templates/[id]**

### Admin — Conteúdo Portal
- **/artigos**
- **/artigos/novo**
- **/artigos/[id]**
- **/lps**

### Admin — Leads (auditoria)
- **/leads**

### Admin — Planos & Assinaturas
- **/planos**
- **/assinaturas**

### Admin — Suporte
- **/suporte**

### Admin — Logs / Auditoria
- **/auditoria**

### Admin — Ayka
- **/ayka/custos**
- **/ayka/catalogo**
- **/ayka/recompensas**

