# Lousa — Data Model (Corretor.one)

> Escopo: **tabelas + campos** (sem enums). Organizado por domínios para facilitar migrations/RLS.

---

## 0) Referências & Geo

### referencia_localidades (cache IBGE — UF/Cidades)
- id (uuid, PK)
- tipo (text, enum REF_LOCALIDADE_TIPO) *(UF | CIDADE)*
- codigo_ibge (int, unique)
- uf (text, enum UF, nullable)
- nome (text)
- payload (jsonb)
- updated_at (timestamptz)

Índices: tipo, uf, lower(nome)

---

### geolocacoes (Google Maps — endereço normalizado)
- id (uuid, PK)
- place_id (text, unique)
- address_json (jsonb)

Campos normalizados:
- logradouro (text)
- numero (text)
- bairro (text)
- cidade (text)
- uf (text, enum UF)
- cep (text)
- lat (numeric)
- lng (numeric)

Display:
- endereco_formatado (text)

- created_at (timestamptz)
- updated_at (timestamptz)

Índices: cidade, uf, bairro, place_id

---

## 1) Auth & Equipe

### auth.users (Supabase)
- padrão Supabase

### admin_users (interno — equipe Corretor.one)
- id (uuid, PK = auth.users.id)
- nome (text)
- email (text, unique)
- papel (text, enum PAPEL_ADMIN)
- status (text, enum STATUS_ADMIN, default ATIVO)
- last_login_at (timestamptz, nullable)
- created_by (uuid, nullable)
- notas (text, nullable)
- created_at (timestamptz)
- updated_at (timestamptz)

---

### verificacoes_contato (OTP — email/whatsapp)
- id (uuid, PK)
- user_tipo (text, enum USER_TIPO) *(PORTAL | CORRETOR)*
- user_id (uuid) *(FK portal_users.id ou profiles.id conforme user_tipo)*
- canal (text, enum CANAL_CONTATO) *(EMAIL | WHATSAPP)*
- destino (text) *(email ou telefone_e164)*
- codigo_hash (text) *(hash do código)*
- expira_em (timestamptz)
- tentativas (int, default 0)
- status (text, enum STATUS_VERIFICACAO)
- enviado_em (timestamptz)
- verificado_em (timestamptz, nullable)
- created_at (timestamptz)

---

## 2) Portal (Usuários finais)

### portal_users
- id (uuid, PK = auth.users.id)
- nome (text)
- sobrenome (text)
- email (text, unique)
- telefone (text, nullable)
- telefone_e164 (text, nullable)
- foto_url (text, nullable)
- status (text, enum STATUS_PORTAL_USER, default ATIVO)

Preferências/consentimentos:
- canais (text[], enum CANAL_CONTATO)
- aceite_marketing_em (timestamptz, nullable)

Verificações:
- email_verificado_em (timestamptz, nullable)
- whatsapp_verificado_em (timestamptz, nullable)

- created_at (timestamptz)
- updated_at (timestamptz)

Regra: portal_user **não pode** ser corretor (mutuamente exclusivo com profiles).

---

### user_favoritos
- id (uuid, PK)
- user_id (uuid, FK portal_users.id)
- imovel_id (uuid, FK imoveis.id)
- created_at (timestamptz)

---

### user_follows
- id (uuid, PK)
- user_id (uuid, FK portal_users.id)
- corretor_id (uuid, FK profiles.id)
- created_at (timestamptz)

Constraints:
- unique(user_id, corretor_id)

Índices:
- user_id (minha lista)
- corretor_id (contagem)

---

### user_briefings
- id (uuid, PK)
- user_id (uuid, FK portal_users.id)
- escopo (text, enum ESCOPO_BRIEFING) *(GERAL | CORRETOR)*
- corretor_id (uuid, FK profiles.id, nullable)

Bloco 1 — Intenção e Negócio
- tipouso (text, enum TIPO_USO, nullable)
- tipoimovel (text[], enum TIPO_IMOVEL_PORTAL, nullable)
- categoriaimovel (text[], enum CATEGORIA_IMOVEL, nullable)
- construcao (text[], enum TIPO_CONSTRUCAO, nullable)
- tiponegociacao (text[], enum TIPO_NEGOCIACAO, nullable)
- intencao_compra (text, enum INTENCAO_COMPRA, nullable)

Bloco 2 — Valores
- valor_min (numeric, nullable)
- valor_max (numeric, nullable)

Bloco 3 — Residencial
- area_util_min (numeric, nullable)
- area_util_max (numeric, nullable)
- quartos_min (int, nullable)
- suites_min (int, nullable)
- vagas_min (int, nullable)
- caracteristicas_residenciais (text[], enum CARACTERISTICA_IMOVEL, nullable)

Bloco 4 — Comercial
- area_util_min_comercial (numeric, nullable)
- area_util_max_comercial (numeric, nullable)
- vagas_min_comercial (int, nullable)
- caracteristicas_comerciais (text[], enum CARACTERISTICA_COMERCIAL, nullable)

Localização
- geolocacao_id (uuid, FK geolocacoes.id, nullable)
- localizacao_texto (text, nullable)
- lat (numeric, nullable)
- lng (numeric, nullable)
- raio_km (numeric, nullable)

Complemento
- texto_livre (text, nullable)

Conteúdo e canal
- conteudos (text[], enum TIPO_CONTEUDO, nullable)
- canais (text[], enum CANAL_CONTATO, nullable)

Controle
- ativo (bool, default true)
- created_at (timestamptz)
- updated_at (timestamptz)

Regras:
- check: (escopo='GERAL' AND corretor_id IS NULL) OR (escopo='CORRETOR' AND corretor_id IS NOT NULL)
- unique(user_id, escopo) quando escopo=GERAL
- unique(user_id, corretor_id) quando escopo=CORRETOR

---

## 3) Corretores (Profiles)

### profiles
- id (uuid, PK = auth.users.id)

Identidade
- primeiro_nome (text)
- sobrenome (text)
- genero (text, enum GENERO, nullable)
- email (text, unique)
- telefone (text, nullable)
- whatsapp (text, nullable)

Verificações
- email_verificado_em (timestamptz, nullable)
- whatsapp_verificado_em (timestamptz, nullable)

Perfil público
- nickname (text, unique) *(slug /[nickname], imutável, max 35, ^[a-z0-9]{1,35}$, sem . e _, sem acentos; bloqueio substrings: corret, imob, imov, aparta, casa)*
- avatar_url (text, nullable)
- imagem_capa_url (text, nullable)
- bio (text, nullable)

Atuação
- uf (text, enum UF)
- cidades_foco (text[], nullable)

CRECI (PF)
- creci_uf (text, enum UF)
- creci_numero (text) *(1–6 dígitos)*
- creci_sufixo (text, default 'F')
- creci_documento_midia_id (uuid, FK midia.id, nullable)
- creci_aprovacao (bool, default false)

Constraints CRECI:
- unique(creci_uf, creci_numero, creci_sufixo)
- check: creci_numero ^[0-9]{1,6}$
- check: creci_sufixo='F'

Segmentos/Portfólio
- imoveis_residenciais (bool, default true)
- imoveis_comerciais (bool, default false)
- imoveis_industriais (bool, default false)

Posicionamento
- imoveis_alto_padrao (bool, default false)
- imoveis_luxo (bool, default false)
- imoveis_medio_padrao (bool, default false)
- imoveis_baixa_renda (bool, default false)

Redes sociais
- instagram, linkedin, pinterest, tiktok, twitter, youtube (text, nullable)

Plano/assinatura
- plano_id (uuid, FK planos.id)
- status (text, enum STATUS_USUARIO, default PENDENTE)

Multi-tenant (futuro)
- imobiliaria_id (uuid, FK imobiliarias.id, nullable)
- papel_imobiliaria (text, enum PAPEL_IMOBILIARIA, nullable)

Domínio personalizado (futuro)
- dominio_custom (text, unique, nullable)
- dominio_status (text, enum STATUS_DOMINIO, default NAO_CONFIGURADO)

- created_at (timestamptz)
- updated_at (timestamptz)

---

## 4) Imóveis & Empreendimentos

### imoveis
- id (uuid, PK)
- owner_id (uuid, FK profiles.id)
- imobiliaria_id (uuid, FK imobiliarias.id, nullable)
- empreendimento_id (uuid, FK empreendimentos.id, nullable)

Identificação
- codigo (text) *(unique por owner_id)*
- slug_publico (text) *(unique por owner_id)*
- titulo (text)
- descricao (text)
- descricao_curta (text, nullable)

Classificação
- finalidade (text, enum FINALIDADE)
- tipo (text, enum TIPO_IMOVEL)
- subtipo (text, enum SUBTIPO_IMOVEL, nullable)
- status (text, enum STATUS_IMOVEL, default RASCUNHO)
- exclusividade (bool, default false)
- destaque (bool, default false)

Valores
- preco_venda (numeric, nullable)
- preco_locacao (numeric, nullable)
- valor_m2 (numeric, nullable)
- condominio (numeric, nullable)
- iptu (numeric, nullable)
- iptu_periodicidade (text, enum PERIODICIDADE, nullable)
- aceita_permuta (bool, default false)
- financiavel (bool, default true)

Dimensões
- area_util, area_total, area_terreno (numeric, nullable)
- frente_metros, fundos_metros (numeric, nullable)
- dormitorios, suites, banheiros, lavabos, vagas (int, nullable)

Detalhes das vagas
- vaga_tamanhos (text[], enum VAGA_TAMANHO, nullable)
- vaga_coberturas (text[], enum VAGA_COBERTURA, nullable)
- vaga_tipos (text[], enum VAGA_TIPO, nullable)

- andar (int, nullable)
- ultimo_andar (bool, default false)
- unidade_numero (text, nullable)
- ano_construcao (int, nullable)

Localização (snapshot + FK)
- geolocacao_id (uuid, FK geolocacoes.id)
- logradouro, numero, bairro, cidade, cep (text)
- bairro_comercial (bool, default false)
- estado (text, enum UF)
- lat, lng (numeric)
- address_json (jsonb)
- endereco_complemento (text, nullable)
- ocultar_numero_publico (bool, default false)

Empreendimento (override)
- usar_midias_empreendimento (bool, default true)
- usar_caracteristicas_empreendimento (bool, default true)

Características
- caracteristicas (text[], enum CARACTERISTICA_IMOVEL)
- vista (text, enum TIPO_VISTA, nullable)
- posicao_solar (text, enum POSICAO_SOLAR, nullable)
- estado_conservacao (text, enum ESTADO_CONSERVACAO, nullable)

Operacional
- placa_no_local (bool, default false)
- chaves_na_mao (bool, default false)
- permite_visita_imediata (bool, default false)
- origem_cadastro (text, enum ORIGEM_IMOVEL, default MANUAL)
- integracao_externa_id (text, nullable)

Publicação/SEO
- publicado_em (timestamptz, nullable)
- meta_title (text, nullable)
- meta_description (text, nullable)
- indexar_google (bool, default true)

Controle
- views_count (int, default 0)
- favoritos_count (int, default 0)
- created_at (timestamptz)
- updated_at (timestamptz)

Índices: owner_id, status, finalidade, tipo, cidade, bairro, preco_venda, preco_locacao

---

### empreendimentos
- id (uuid, PK)
- owner_id (uuid, FK profiles.id)
- imobiliaria_id (uuid, FK imobiliarias.id, nullable)
- slug_publico (text)
- nome (text)
- descricao (text, nullable)

Localização (snapshot + FK)
- geolocacao_id (uuid, FK geolocacoes.id)
- logradouro, numero, bairro, cidade (text)
- estado (text, enum UF)
- cep (text, nullable)
- lat, lng (numeric)
- address_json (jsonb, nullable)

Fase
- fase (text, enum FASE_EMPREENDIMENTO, default ENTREGUE)
- previsao_entrega_em (date, nullable)
- estagio_obra (text, enum ESTAGIO_OBRA, nullable)

Infos reutilizáveis
- ano_construcao (int, nullable)
- n_torres, n_andares, n_unidades (int, nullable)
- construtora, incorporadora, administradora (text, nullable)

Características do condomínio
- caracteristicas (text[], enum CARACTERISTICA_EMPREENDIMENTO, nullable)

Status
- status (text, enum STATUS_EMPREENDIMENTO, default RASCUNHO)
- publicado_em (timestamptz, nullable)
- created_at (timestamptz)
- updated_at (timestamptz)

Regra: capa = primeira mídia por ordem (midia_relacoes.ordem)

---

### imobiliarias (futuro)
- id (uuid, PK)
- nome_fantasia, razao_social, cnpj (text)
- telefone, email (text)
- logo_url (text)
- bio (text)
- cidade (text)
- estado (text, enum UF)
- status (text, enum STATUS_IMOBILIARIA)

Domínio (futuro)
- dominio_custom (text, unique, nullable)
- dominio_status (text, enum STATUS_DOMINIO, default NAO_CONFIGURADO)

- created_at (timestamptz)
- updated_at (timestamptz)

---

## 5) Mídia

### midia
- id (uuid, PK)
- owner_id (uuid, FK profiles.id)
- tipo (text, enum TIPO_MIDIA)

Arquivo
- storage_provider (text, enum STORAGE_PROVIDER, default SUPABASE)
- storage_bucket (text)
- storage_path (text)
- url (text)

Dimensões
- largura, altura (int, nullable)
- tamanho_bytes (bigint, nullable)

SEO
- alt, titulo, legenda (text, nullable)
- caracteristica (text, nullable)

IA
- alt_gerado_em (timestamptz, nullable)
- alt_origem (text, enum ALT_ORIGEM, default MANUAL)

- hash (text, nullable)
- created_at (timestamptz)

---

### midia_variantes
- id (uuid, PK)
- midia_id (uuid, FK midia.id)
- tipo (text, enum VARIANTE_TIPO)
- largura (int)
- altura (int)
- storage_path (text)
- tamanho_bytes (bigint, nullable)
- created_at (timestamptz)

Constraint: unique(midia_id, tipo)

---

### midia_relacoes
- id (uuid, PK)
- owner_id (uuid, FK profiles.id)
- ref_tipo (text, enum REF_TIPO)
- ref_id (uuid)
- midia_id (uuid, FK midia.id)
- ordem (int, default 0)
- grupo (text, nullable)
- created_at (timestamptz)

Índices: (ref_tipo, ref_id)
Constraint: unique(ref_tipo, ref_id, midia_id)

---

## 6) Contatos

### contatos
- id (uuid, PK)
- owner_id (uuid, FK profiles.id)
- perfil (text, enum PERFIL_CONTATO)

Campos
- nome (text)
- email (text, nullable)
- email_lower (text, nullable)
- telefone1, telefone2 (text, nullable)
- telefone1_e164, telefone2_e164 (text, nullable)
- cpf (text, nullable)
- cnpj (text, nullable)
- razao_social (text, nullable)
- observacoes (text, nullable)

- created_at (timestamptz)
- updated_at (timestamptz)

Regras (V1)
- não permitir CPF e CNPJ juntos
- se CNPJ, razao_social obrigatório

Anti-duplicação (prioridade)
- unique parcial: unique(owner_id, email_lower) quando email_lower IS NOT NULL
- unique parcial: unique(owner_id, telefone1_e164) quando telefone1_e164 IS NOT NULL

Reforço
- unique parcial: unique(owner_id, cpf) quando cpf IS NOT NULL
- unique parcial: unique(owner_id, cnpj) quando cnpj IS NOT NULL

---

### contato_empreendimentos
- id (uuid, PK)
- owner_id (uuid, FK profiles.id)
- contato_id (uuid, FK contatos.id)
- empreendimento_id (uuid, FK empreendimentos.id)
- papel (text, enum PAPEL_CONTATO_EMPREENDIMENTO)
- created_at (timestamptz)

Constraint: unique(contato_id, empreendimento_id, papel)

---

### contato_imoveis
- id (uuid, PK)
- owner_id (uuid, FK profiles.id)
- contato_id (uuid, FK contatos.id)
- imovel_id (uuid, FK imoveis.id)
- papel (text, enum PAPEL_CONTATO_IMOVEL)
- created_at (timestamptz)

Constraint: unique(contato_id, imovel_id, papel)

---

## 7) CRM

### leads
- id (uuid, PK)
- owner_id (uuid, FK profiles.id)
- nome (text)
- email (text, nullable)
- telefone (text, nullable)
- telefone_e164 (text, nullable)
- origem (text, enum ORIGEM_LEAD)
- mensagem (text, nullable)
- imovel_id (uuid, FK imoveis.id, nullable)
- utm (jsonb, nullable)
- status (text, enum STATUS_LEAD, default NOVO)
- created_at (timestamptz)
- updated_at (timestamptz)

---

### negocios
- id (uuid, PK)
- owner_id (uuid, FK profiles.id)
- lead_id (uuid, FK leads.id)
- titulo (text, nullable)
- etapa (text, enum ETAPA_NEGOCIO, default NOVO)
- valor_estimado (numeric, nullable)
- finalidade (text, enum FINALIDADE, nullable)
- imovel_id (uuid, FK imoveis.id, nullable)
- empreendimento_id (uuid, FK empreendimentos.id, nullable)
- lista_id (uuid, FK listas.id, nullable)
- notas (text, nullable)
- proxima_acao_em (timestamptz, nullable)
- fechado_em (timestamptz, nullable)
- created_at (timestamptz)
- updated_at (timestamptz)

---

### propostas
- id (uuid, PK)
- owner_id (uuid, FK profiles.id)
- lead_id (uuid, FK leads.id)
- negocio_id (uuid, FK negocios.id, nullable)
- titulo (text)
- tipo (text, enum TIPO_PROPOSTA)
- status (text, enum STATUS_PROPOSTA, default RASCUNHO)
- valor (numeric, nullable)
- conteudo (jsonb, nullable)
- arquivo_midia_id (uuid, FK midia.id, nullable)
- enviada_em (timestamptz, nullable)
- created_at (timestamptz)
- updated_at (timestamptz)

---

### atividades
- id (uuid, PK)
- owner_id (uuid, FK profiles.id)
- lead_id (uuid, FK leads.id) *(obrigatório)*
- negocio_id (uuid, FK negocios.id, nullable)
- tipo (text, enum TIPO_ATIVIDADE)
- titulo (text)
- descricao (text, nullable)
- quando_em (timestamptz, nullable)
- concluida_em (timestamptz, nullable)
- status (text, enum STATUS_ATIVIDADE, default PENDENTE)
- created_at (timestamptz)
- updated_at (timestamptz)

Regra recomendada: se negocio_id preenchido, deve pertencer ao mesmo lead_id.

---

### timeline_eventos
- id (uuid, PK)
- owner_id (uuid, FK profiles.id)
- lead_id (uuid, FK leads.id)
- negocio_id (uuid, FK negocios.id, nullable)
- tipo (text, enum TIPO_TIMELINE)
- titulo (text)
- detalhes (jsonb, nullable)
- created_at (timestamptz)

---

## 8) Listas/Seleções

### listas
- id (uuid, PK)
- owner_id (uuid, FK profiles.id)
- titulo (text)
- descricao (text)
- cliente_nome (text)
- cliente_email (text)
- cliente_telefone (text)
- status (text, enum STATUS_LISTA)
- slug_publico (text, unique)
- created_at (timestamptz)
- updated_at (timestamptz)

---

### lista_itens
- id (uuid, PK)
- lista_id (uuid, FK listas.id)
- imovel_id (uuid, FK imoveis.id)
- ordem (int)
- nota (text)

---

## 9) Marketing (Templates, Posts, Campanhas, Audiência)

### templates (criativos — criados pela equipe)
- id (uuid, PK)
- nome (text)
- tipo (text, enum TIPO_TEMPLATE)
- objetivo (text, enum OBJETIVO_TEMPLATE)
- itens_min (int, nullable)
- itens_max (int, nullable)
- provider (text, enum PROVIDER_TEMPLATE)
- provider_template_id (text)
- config (jsonb)
- ativo (bool)

---

### posts (materiais gerados)
- id (uuid, PK)
- owner_id (uuid, FK profiles.id)
- imovel_id (uuid, FK imoveis.id)
- template_id (uuid, FK templates.id)
- tipo (text, enum TIPO_POST)
- status (text, enum STATUS_POST)
- resultado_url (text)
- payload (jsonb)
- created_at (timestamptz)

---

### seguidores
- id (uuid, PK)
- owner_id (uuid, FK profiles.id)
- nome (text)
- email (text, nullable)
- telefone (text, nullable)
- origem (text)
- created_at (timestamptz)

---

### listas_contatos
- id (uuid, PK)
- owner_id (uuid, FK profiles.id)
- nome (text)
- descricao (text)
- created_at (timestamptz)

---

### lista_contatos_itens
- id (uuid, PK)
- lista_id (uuid, FK listas_contatos.id)
- seguidor_id (uuid, FK seguidores.id)

---

### campanhas
- id (uuid, PK)
- owner_id (uuid, FK profiles.id)
- tipo (text, enum TIPO_CAMPANHA)
- objetivo (text, enum OBJETIVO_CAMPANHA)
- template_id (uuid, FK templates.id)
- titulo (text)
- briefing (jsonb)
- status (text, enum STATUS_CAMPANHA)
- lista_id (uuid, FK listas_contatos.id)
- agendada_para (timestamptz, nullable)
- enviada_em (timestamptz, nullable)
- metricas (jsonb)
- created_at (timestamptz)

---

### campanha_itens
- id (uuid, PK)
- campanha_id (uuid, FK campanhas.id)
- tipo_item (text, enum TIPO_ITEM_CAMPANHA)
- item_id (uuid)
- ordem (int)

---

## 10) Billing (Planos & Assinaturas)

### planos
- id (uuid, PK)
- nome (text) *(Grátis, Presença, Destaque, Autoridade)*
- slug (text, unique)
- preco_mensal (numeric)
- preco_anual (numeric, nullable)
- limite_imoveis (int, nullable)
- limite_emails_mes (int, nullable)
- limite_whatsapp_mes (int, nullable)
- limite_storage_mb (int, nullable)
- ayka_franquia_mensal (int, default 0)
- recursos (jsonb)
- ativo (bool)
- created_at (timestamptz)
- updated_at (timestamptz)

---

### assinaturas
- id (uuid, PK)
- owner_id (uuid, FK profiles.id)
- plano_id (uuid, FK planos.id)
- status (text, enum STATUS_ASSINATURA)
- inicio_em (timestamptz)
- fim_em (timestamptz, nullable)
- cancelado_em (timestamptz, nullable)
- created_at (timestamptz)

