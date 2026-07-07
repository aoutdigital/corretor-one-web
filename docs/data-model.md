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
- preposicao_em (text, enum PREPOSICAO_EM) *(em | no | na, default em)*
- payload (jsonb)
- updated_at (timestamptz)

Índices: tipo, uf, lower(nome)

---

### referencia_bairros (catálogo de bairros para preposição)
- id (uuid, PK)
- bairro (text)
- bairro_normalizado (text, unique)
- preposicao_em (text, enum PREPOSICAO_EM) *(em | no | na, default em)*
- ativo (boolean, default true)
- created_at (timestamptz)
- updated_at (timestamptz)

Índices: ativo, lower(bairro)

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

Bloco 1 — Objetivo e Negócio
- objetivolead (text[], enum OBJETIVO_LEAD, nullable)
- tipouso (text, enum TIPO_USO, nullable)
- tipoimovel (text[], enum TIPO_IMOVEL_PORTAL, nullable)
- categoriaimovel (text[], enum CATEGORIA_IMOVEL, nullable)
- subcategoriaimovel (text[], nullable) *(tokens da UI de tipologia: ex. PADRAO, GARDEN, SOBRADO)*
- construcao (text[], enum TIPO_CONSTRUCAO, nullable)
- tiponegociacao (text[], enum TIPO_NEGOCIACAO, nullable) *(derivado para match/compatibilidade)*
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
- corretor_one_registro (int, unique, not null, default sequence iniciando em 1001) *(registro numérico interno Corretor.one usado para compor código de imóvel)*

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
- logo_nickname_url (text, nullable) *(logo público do corretor com nickname, versão padrão)*
- logo_nickname_white_url (text, nullable) *(logo público do corretor com nickname, versão branca para marca d'água)*
- frase_impacto (text, nullable) *(máx. 90 caracteres; frase curta exibida como headline da seção Sobre no perfil público)*
- bio (text, nullable) *(rich text sanitizado; limite editorial de 650 caracteres em texto legível)*

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

### provas_sociais
- id (uuid, PK)
- owner_id (uuid, FK profiles.id)
- midia_id (uuid, FK midia.id, nullable)

Conteúdo:
- tipo (text, enum PROVA_SOCIAL_TIPO)
- titulo (text)
- descricao (text, nullable)
- depoimento (text, nullable)
- cliente_nome_publico (text, nullable) *(nome curto, iniciais ou família; não exigir nome completo)*
- localidade (text, nullable)
- data_momento (date, nullable)
- tags (text[], nullable) *(ex: Venda, Locação, Escritura)*

Imagem pública:
- imagem_url (text, nullable)
- imagem_alt (text, nullable)
- consentimento_imagem_confirmado (bool, default false)

Publicação:
- status (text, enum STATUS_PROVA_SOCIAL, default RASCUNHO)
- ordem (int, default 0)
- destaque (bool, default false)
- publicado_em (timestamptz, nullable)

- created_at (timestamptz)
- updated_at (timestamptz)

Índices: (owner_id, status, ordem), (owner_id, destaque), (publicado_em desc)

Regras:
- RLS por owner para CRUD no app.
- Leitura pública apenas quando `status = PUBLICADO` e o `profiles.status = ATIVO`.
- Se houver `imagem_url`, exigir `consentimento_imagem_confirmado = true` para publicar.
- Imagens de prova social são registros humanos/depoimentos e **não** passam pela geração de marca d'água usada em imóveis/empreendimentos.

---

### profile_authority_numbers
- id (uuid, PK)
- owner_id (uuid, FK profiles.id)

Conteúdo:
- tipo (text, enum PROFILE_AUTHORITY_NUMBER_TYPE)
  - VGV_NEGOCIADO
  - IMOVEIS_VENDIDOS_ALUGADOS
  - CLIENTES_ATENDIDOS
  - ANOS_CARREIRA
- valor (text) *(ex.: R$ 150M, 120, 18; o sinal `+` é aplicado pela UI pública quando exibido)*
- rotulo (text) *(label pública fixa por tipo: Em VGV negociado, Imóveis comercializados, Clientes atendidos, Anos de carreira)*
- descricao (text, nullable) *(reservado para uso futuro; não aparece no cadastro V1)*

Publicação:
- ordem (int, default 0)
- visivel (bool, default true)

- created_at (timestamptz)
- updated_at (timestamptz)

Índices: (owner_id, ordem), (owner_id, visivel, ordem)

Constraints:
- unique(owner_id, tipo)
- check: `valor` entre 1 e 24 caracteres
- check: `rotulo` entre 1 e 80 caracteres
- check: `descricao` até 160 caracteres
- check: `ordem >= 0`

Regras:
- RLS por owner para CRUD no app.
- Leitura pública apenas quando `visivel = true` e o `profiles.status = ATIVO`.
- O produto permite os quatro tipos acima, mas a seção pública exibe no máximo 3 números para manter leitura editorial.
- O limite de no máximo 3 registros visíveis por corretor deve ser validado no backend e protegido no banco.

---

## 4) Imóveis & Empreendimentos

### imoveis
- id (uuid, PK)
- owner_id (uuid, FK profiles.id)
- imobiliaria_id (uuid, FK imobiliarias.id, nullable)
- empreendimento_id (uuid, FK empreendimentos.id, nullable)
- empreendimento_tipo_id (uuid, FK empreendimento_tipos.id, nullable)
- empreendimento_tipologia_label (text, nullable)

Identificação
- codigo (text, nullable em rascunho) *(unique por owner_id quando preenchido; gerado automaticamente na publicação no padrão `ONE-<registro_corretor>-<sequencia_imovel>` ex.: `ONE-1001-0001`)*
- slug_publico (text, nullable em rascunho) *(unique por owner_id quando preenchido; gerado automaticamente na publicação e recalculado quando campos de URL mudam no imóvel publicado)*
- titulo (text)
- descricao (text)
- descricao_curta (text, nullable)

Classificação
- finalidade (text, enum FINALIDADE)
- tipo (text, enum TIPO_IMOVEL)
- subtipo (text, enum SUBTIPO_IMOVEL, nullable)
- status (text, enum STATUS_IMOVEL, default RASCUNHO)
- step_rascunho (int, default 1, check 1..11) *(etapa atual do multistep para retomar rascunho)*
- exclusividade (bool, default false)
- destaque (bool, default false)

Valores
- preco_venda (numeric, nullable)
- preco_locacao (numeric, nullable)
- comissao_locacao (text, nullable)
- valor_m2 (numeric, nullable)
- condominio (numeric, nullable)
- iptu (numeric, nullable)
- iptu_periodicidade (text, enum PERIODICIDADE, nullable)
- aceita_permuta (bool, default false)
- financiavel (bool, default true)
- tipo_negociacao (text, enum TIPO_NEGOCIACAO, nullable)
- comissao_venda_percentual (numeric, nullable)
- minimo_aceito_em_maos (numeric, nullable)
- descricao_permuta (text, nullable)

Parceria, captação e exclusividade
- veio_do_bolsao (bool, default false)
- captacao_corretor_parceiro (bool, default false)
- corretor_parceiro_nome, corretor_parceiro_telefone, corretor_parceiro_email (text, nullable)
  - uso em UI:
  - `captacao_corretor_parceiro = true` -> contato do corretor parceiro
  - `captacao_corretor_parceiro = false` (com ou sem exclusividade) -> contato do proprietário
- comissao_captador_percentual (numeric, nullable)
- comissao_vendedor_percentual (numeric, nullable)
- outras_comissoes_percentual (numeric, nullable)
- exclusividade_comissao_minha_percentual (numeric, nullable)
- exclusividade_comissao_parceiro_percentual (numeric, nullable)
- exclusividade_outras_comissoes_percentual (numeric, nullable)
- exclusividade_data_vencimento (date, nullable)
- exclusividade_observacoes (text, nullable)
- disponibilizar_no_bolsao_parceria (bool, default false)
- bolsao_permitir_mudanca_preco (bool, default false)
- bolsao_permitir_download_midia_kit (bool, default false)
- bolsao_somente_visitas_agendadas (bool, default false)
- bolsao_somente_visitas_com_minha_presenca (bool, default false)
- aceite_corretor_exclusivo (bool, default false)
- regra_geral_exclusividade (text, nullable)
- aceita_parceria_status (text, enum ACEITA_PARCERIA_STATUS, nullable)
- divisao_comissao_parceria (text, nullable)
- ocupacao_imovel (text, enum OCUPACAO_IMOVEL, nullable)
- observacoes_gerais (text, nullable)

Dimensões
- area_util, area_total, area_terreno (numeric, nullable)
- frente_metros, fundos_metros (numeric, nullable)
- lateral_1_metros, lateral_2_metros (numeric, nullable)
- dormitorios, suites, banheiros, lavabos, vagas (int, nullable)
- salas, cozinhas (int, nullable)

Detalhes das vagas
- vaga_tamanhos (text[], enum VAGA_TAMANHO, nullable)
- vaga_coberturas (text[], enum VAGA_COBERTURA, nullable)
- vaga_tipos (text[], enum VAGA_TIPO, nullable)

- andar (int, nullable)
- ultimo_andar (bool, default false)
- mostrar_andar_no_anuncio (bool, default false)
- unidade_numero (text, nullable)
- ano_construcao (int, nullable)

Localização (snapshot + FK)
- geolocacao_id (uuid, FK geolocacoes.id)
- logradouro, numero, bairro, cidade, cep (text)
- bairro_comercial (text, nullable) *(região comercial de referência)*
- estado (text, enum UF)
- lat, lng (numeric)
- address_json (jsonb)
- endereco_complemento (text, nullable)
- enderecovisualizacao (text, enum ENDERECO_VISUALIZACAO_IMOVEL, default END_SEM_COMPLEMENTO)
- ocultar_numero_publico (bool, default false) *(legado / compatibilidade)*
- mostrar_complemento_no_anuncio (bool, default false) *(legado / compatibilidade)*

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

### imovel_ambientes
- id (uuid, PK)
- owner_id (uuid, FK profiles.id)
- imovel_id (uuid, FK imoveis.id)
- tipo_ambiente (text, enum TIPO_AMBIENTE_IMOVEL)
- ordem (int, default 0)
- principal (bool, default false)
- area_m2 (numeric, nullable)
- dados (jsonb, default `{}`)
- created_at (timestamptz)
- updated_at (timestamptz)

Regras:
- unique(imovel_id, tipo_ambiente, ordem)
- unique parcial por ambiente principal: unique(imovel_id, tipo_ambiente) where principal=true
- `dados` deve ser objeto json
- validação por tipo de ambiente é feita no backend/app

---

### empreendimentos
- id (uuid, PK)
- owner_id (uuid, FK profiles.id)
- imobiliaria_id (uuid, FK imobiliarias.id, nullable)
- slug_publico (text, nullable em RASCUNHO; obrigatório para PUBLICADO, unique por owner_id quando preenchido)
- nome (text)
- descricao (text, nullable)
- tipo_uso (text, enum TIPO_USO, nullable)
- categoria_imovel (text, enum TIPO_IMOVEL, nullable)
- categoria_residencial (text, enum CATEGORIA_RESIDENCIAL_EMPREENDIMENTO, nullable)
- tipologias_residenciais (text[], enum TIPOLOGIA_RESIDENCIAL_EMPREENDIMENTO, default [])
- categoria_comercial (text, enum CATEGORIA_COMERCIAL_EMPREENDIMENTO, nullable)
- tipologias_comerciais (text[], enum TIPOLOGIA_COMERCIAL_EMPREENDIMENTO, default [])

Regra de modelagem (empreendimentos residenciais):
- `tipo_uso = RESIDENCIAL` usa `categoria_residencial` + `tipologias_residenciais` (1..N tipologias)
- `tipo_uso = COMERCIAL` usa `categoria_comercial` + `tipologias_comerciais` (1..N tipologias)
- `categoria_residencial`: `APARTAMENTOS` | `CASAS` | `TERRENOS`
- `categoria_comercial`: `ESCRITORIO_CONJUNTO` | `CASAS` | `TERRENOS` | `SHOPPING` | `LOGISTICO`
- `categoria_imovel` fica como campo legado/compatibilidade para integrações antigas
- `categoria_imovel` em comercial também é preenchido por mapeamento legado para integrações antigas

Localização (snapshot + FK)
- geolocacao_id (uuid, FK geolocacoes.id)
- logradouro, numero, bairro, cidade (text)
- bairro_comercial (text, nullable) *(região comercial de referência)*
- localizacao_contexto (jsonb, default `{}`) *(enriquecimento opcional da localização para texto comercial/IA: perfil da região, mobilidade, comércio/serviços, lazer/estilo de vida e resumo local)*
- estado (text, enum UF)
- cep (text, nullable)
- lat, lng (numeric)
- address_json (jsonb, nullable)

Fase
- fase (text, enum FASE_EMPREENDIMENTO, default ENTREGUE)
- previsao_entrega_em (date, nullable)
- estagio_obra (text, enum ESTAGIO_OBRA, nullable)
- obra_percentuais (jsonb, nullable) *(ex.: fundacao/acabamento em percentual)*

Infos reutilizáveis
- ano_construcao (int, nullable)
- n_torres, n_andares, n_unidades (int, nullable)
- qtd_elevadores, unidades_por_andar, unidades_terreo, unidades_cobertura (int, nullable)
- construtora, incorporadora, administradora (text, nullable)
- tipos_cadastro (jsonb, default []) *(legado/compatibilidade; fonte principal passou a ser tabela relacional `empreendimento_tipos`)*

Regra de aplicabilidade (estrutura vertical):
- `qtd_elevadores`, `unidades_por_andar`, `unidades_terreo`, `unidades_cobertura` só podem ser preenchidos em:
  - `tipo_uso = RESIDENCIAL` com `categoria_residencial = APARTAMENTOS`
  - `tipo_uso = COMERCIAL` com `categoria_comercial = ESCRITORIO_CONJUNTO`

Características do condomínio
- caracteristicas (text[], enum CARACTERISTICA_EMPREENDIMENTO, nullable)

Status
- status (text, enum STATUS_EMPREENDIMENTO, default RASCUNHO)
  - fluxo no app: RASCUNHO -> PUBLICADO -> PAUSADO (sem ação de INATIVAR para empreendimentos)
- publicado_em (timestamptz, nullable)
- resumo_curto (text, nullable)
- meta_title (text, nullable)
- meta_description (text, nullable)
- keywords (text[], nullable/default [])
- created_at (timestamptz)
- updated_at (timestamptz)

Regra: capa = primeira mídia por ordem (midia_relacoes.ordem)

---

### empreendimento_tipos
- id (uuid, PK)
- owner_id (uuid, FK profiles.id)
- empreendimento_id (uuid, FK empreendimentos.id)
- ordem (int, default 0)
- nome (text, nullable)
- torre_nome (text, nullable)
- tipologia (text, nullable)
- area_privativa (numeric, nullable)
- dormitorios (int, nullable)
- suites (int, nullable)
- banheiros (int, nullable)
- vagas (int, nullable)
- qtd_unidades (int, nullable)
- created_at (timestamptz)
- updated_at (timestamptz)

Regras:
- unique(empreendimento_id, ordem)
- valores numéricos não negativos

---

### empreendimento_tipos_plantas
- id (uuid, PK)
- owner_id (uuid, FK profiles.id)
- empreendimento_id (uuid, FK empreendimentos.id)
- empreendimento_tipo_id (uuid, FK empreendimento_tipos.id)
- midia_id (uuid, FK midia.id)
- ordem (int, default 0)
- alt (text, nullable)
- legenda (text, nullable)
- created_at (timestamptz)
- updated_at (timestamptz)

Regras:
- máximo de 3 imagens por tipo (ordem 0..2)
- unique(empreendimento_tipo_id, ordem)
- unique(empreendimento_tipo_id, midia_id)

---

### empreendimento_rascunhos
- id (uuid, PK)
- owner_id (uuid, FK profiles.id)
- etapa_atual (int, default 1, check 1..8)
- titulo (text, nullable)
- payload (jsonb) *(snapshot do multistep para autosave)*
- created_at (timestamptz)
- updated_at (timestamptz)

Regras:
- limite de 5 rascunhos por corretor (regra de aplicação/API)

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

### imovel_midia_publica
- id (uuid, PK)
- owner_id (uuid, FK profiles.id)
- imovel_id (uuid, FK imoveis.id)
- midia_id (uuid, FK midia.id)
- midia_relacao_id (uuid, FK midia_relacoes.id)
- ordem (int, default 0)
- indice_publico (int, >= 1)
- slug_publico (text)
- storage_provider (text, enum STORAGE_PROVIDER, default SUPABASE)
- storage_bucket (text)
- storage_path (text)
- url (text)
- created_at (timestamptz)
- updated_at (timestamptz)

Índices: (owner_id, imovel_id), (imovel_id, ordem, indice_publico), (slug_publico)

Constraints:
- unique(midia_relacao_id)
- unique(imovel_id, indice_publico)
- unique(imovel_id, midia_id)
- unique(storage_provider, storage_bucket, storage_path)

Regras:
- Só recebe imagens do imóvel quando o imóvel está `PUBLICADO`.
- URL pública da imagem usa o slug do imóvel + índice numérico (1..N).
- As imagens públicas são geradas com marca d'água e atualizadas quando há publish/republish ou alteração da ordem.
- Em status diferente de `PUBLICADO`, os assets públicos do imóvel são removidos.

---

### empreendimento_midia_publica
- id (uuid, PK)
- owner_id (uuid, FK profiles.id)
- empreendimento_id (uuid, FK empreendimentos.id)
- midia_id (uuid, FK midia.id)
- midia_relacao_id (uuid, FK midia_relacoes.id)
- ordem (int, default 0)
- indice_publico (int, >= 1)
- slug_publico (text)
- storage_provider (text, enum STORAGE_PROVIDER, default SUPABASE)
- storage_bucket (text)
- storage_path (text)
- url (text)
- created_at (timestamptz)
- updated_at (timestamptz)

Índices: (owner_id, empreendimento_id), (empreendimento_id, ordem, indice_publico), (slug_publico)

Constraints:
- unique(midia_relacao_id)
- unique(empreendimento_id, indice_publico)
- unique(empreendimento_id, midia_id)
- unique(storage_provider, storage_bucket, storage_path)

Regras:
- Só recebe imagens do empreendimento quando o empreendimento está `PUBLICADO`.
- URL pública da imagem usa o slug do empreendimento + índice numérico (1..N).
- As imagens públicas são geradas com marca d'água e atualizadas quando há publish/republish ou alteração da ordem.
- Em status diferente de `PUBLICADO`, os assets públicos do empreendimento são removidos.

---

### midia_delete_jobs
- id (uuid, PK)
- owner_id (uuid, FK profiles.id)
- midia_id (uuid, nullable)
- storage_provider (text, enum STORAGE_PROVIDER)
- storage_bucket (text)
- storage_path (text)
- status (text, enum STATUS_MIDIA_DELETE_JOB)
- tentativas (int, default 0)
- erro (text, nullable)
- next_retry_at (timestamptz, nullable)
- started_at (timestamptz, nullable)
- finished_at (timestamptz, nullable)
- created_at (timestamptz)
- updated_at (timestamptz)

Índices: (owner_id, status, created_at), (status, next_retry_at, created_at)
Constraint: unique(storage_provider, storage_bucket, storage_path)

Regra:
- Exclusão de mídia é assíncrona por fila.
- UI remove imediatamente vínculo/registro; remoção física no storage é processada por worker/cron.

---

### imovel_delete_jobs
- id (uuid, PK)
- owner_id (uuid, FK profiles.id)
- imovel_id (uuid) *(sem FK; o imóvel já pode ter sido removido da tabela principal quando o worker processar a fila)*
- status (text, enum STATUS_IMOVEL_DELETE_JOB)
- tentativas (int, default 0)
- erro (text, nullable)
- next_retry_at (timestamptz, nullable)
- started_at (timestamptz, nullable)
- finished_at (timestamptz, nullable)
- created_at (timestamptz)
- updated_at (timestamptz)

Índices: (owner_id, status, created_at), (status, next_retry_at, created_at)
Constraint: unique(owner_id, imovel_id)

Regra:
- Exclusão de imóvel é assíncrona por fila.
- O imóvel sai imediatamente da listagem e dos registros públicos; o worker limpa mídias e vínculos órfãos remanescentes.

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
- profissao (text, nullable)
- endereco (text, nullable)
- numero (text, nullable)
- complemento (text, nullable)
- bairro (text, nullable)
- cep (text, nullable)
- cidade (text, nullable)
- uf (text, enum UF, nullable)
- pais (text, nullable)
- email (text, nullable)
- telefone (text, nullable)
- telefone_e164 (text, nullable)
- origem (text, enum ORIGEM_LEAD)
- mensagem (text, nullable)
- imovel_id (uuid, FK imoveis.id, nullable)
- utm (jsonb, nullable)
- form_key (text, nullable) — origem funcional do formulário público (`whatsapp_contact`, `property_info`, `visit_schedule`, `curadoria`)
- page_url (text, nullable) — URL pública onde a captação aconteceu
- referrer (text, nullable) — referência HTTP/browser quando disponível
- form_payload (jsonb, default `{}`) — contexto flexível do formulário, sem substituir campos normalizados do lead
- status (text, enum STATUS_LEAD, default NOVO)
- motivo_desqualificacao (text, enum MOTIVO_DESQUALIFICACAO, nullable)
- aguardando_produto (boolean, default false)
- created_at (timestamptz)
- updated_at (timestamptz)

Regras:
- `motivo_desqualificacao` só pode existir quando `status = DESQUALIFICADO`
- `aguardando_produto` é um sinal auxiliar operacional e não substitui o estágio comercial principal do lead
- formulários públicos V1 gravam em `leads` e usam `form_payload` para contexto; não criam `lead_briefings` automaticamente

---

### lead_briefings
- id (uuid, PK)
- owner_id (uuid, FK profiles.id)
- lead_id (uuid, FK leads.id)

Bloco 1 — Objetivo e Negócio
- objetivolead (text[], enum OBJETIVO_LEAD, nullable)
- tipouso (text, enum TIPO_USO, nullable)
- tipoimovel (text[], enum TIPO_IMOVEL_PORTAL, nullable)
- categoriaimovel (text[], enum CATEGORIA_IMOVEL, nullable)
- subcategoriaimovel (text[], nullable) *(tokens da UI de tipologia: ex. PADRAO, GARDEN, SOBRADO)*
- construcao (text[], enum TIPO_CONSTRUCAO, nullable)
- tiponegociacao (text[], enum TIPO_NEGOCIACAO, nullable) *(derivado para match/compatibilidade)*
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
- created_at (timestamptz)
- updated_at (timestamptz)

Regras:
- unique(lead_id)
- espelha o briefing do usuário do portal quando disponível, mas é uma cópia operacional do CRM, sem vínculo vivo com `portal_users`
- pode ser semeado a partir de `user_briefings` no capture do lead, preservando edições futuras do corretor no CRM

Índices:
- owner_id
- lead_id

---

### lead_imoveis
- id (uuid, PK)
- owner_id (uuid, FK profiles.id)
- lead_id (uuid, FK leads.id)
- imovel_id (uuid, FK imoveis.id)
- created_at (timestamptz)
- updated_at (timestamptz)

Constraints:
- unique(lead_id, imovel_id)

Índices:
- owner_id
- lead_id

---

### lead_localizacoes_interesse
- id (uuid, PK)
- owner_id (uuid, FK profiles.id)
- lead_id (uuid, FK leads.id)
- geolocacao_id (uuid, FK geolocacoes.id, nullable)
- localizacao_texto (text, nullable)
- lat (numeric, nullable)
- lng (numeric, nullable)
- raio_km (numeric, nullable)
- created_at (timestamptz)
- updated_at (timestamptz)

Regra:
- check: geolocacao_id is not null OR localizacao_texto is not null OR (lat is not null AND lng is not null)

Índices:
- owner_id
- lead_id

---

### negocios
Base técnica das oportunidades do CRM.

- id (uuid, PK)
- owner_id (uuid, FK profiles.id)
- lead_id (uuid, FK leads.id)
- titulo (text, nullable)
- modalidade (text, enum MODALIDADE_NEGOCIO, default VENDA)
- fase (text, enum FASE_NEGOCIO, default NEGOCIACAO)
- subfase_juridica (text, enum SUBFASE_JURIDICA_NEGOCIO, nullable)
- valor (numeric, nullable)
- comissaopercentual (numeric, nullable)
- comissaovalor (numeric, nullable)
- financiamentovalor (numeric, nullable)
- recursopropriovalor (numeric, nullable)
- fgtsvalor (numeric, nullable)
- outrosrecursosvalor (numeric, nullable)
- imovel_id (uuid, FK imoveis.id, nullable)
- observacoes (text, nullable)
- proxima_acao_em (timestamptz, nullable)
- perdido_em (timestamptz, nullable)
- ganho_em (timestamptz, nullable)
- created_at (timestamptz)
- updated_at (timestamptz)

Regras:
- oportunidade pode nascer sem imóvel associado
- `subfase_juridica` só pode existir quando `fase = JURIDICO`
- `fase = JURIDICO` requer `imovel_id`
- `fase = GANHO` requer `imovel_id`
- quando existir `imovel_id`, `comissaopercentual` pode nascer preenchido a partir de `imoveis.comissao_venda_percentual`
- quando `valor`, `comissaopercentual` e `comissaovalor` estiverem preenchidos, `comissaovalor` deve refletir o percentual aplicado sobre o valor da oportunidade
- para `modalidade = VENDA`, a soma de `financiamentovalor + recursopropriovalor + fgtsvalor + outrosrecursosvalor` deve fechar o valor da oportunidade

Observações de transição:
- `etapa` (ETAPA_NEGOCIO) é legado e deve ser substituído por `fase`
- `valor_estimado` deve ser substituído por `valor`
- `finalidade`, `empreendimento_id` e `lista_id` deixam de ser a base do fluxo principal de oportunidade
- v1 da oportunidade foca em `VENDA`; `LOCACAO` e `CAPTACAO` permanecem modeladas para evolução futura

---

### propostas
- id (uuid, PK)
- owner_id (uuid, FK profiles.id)
- lead_id (uuid, FK leads.id)
- negocio_id (uuid, FK negocios.id)
- titulo (text)
- tipo (text, enum TIPO_PROPOSTA)
- status (text, enum STATUS_PROPOSTA, default RASCUNHO)
- valor (numeric, nullable)
- conteudo (jsonb, nullable)
- arquivo_midia_id (uuid, FK midia.id, nullable)
- enviada_em (timestamptz, nullable)
- vencimento_em (timestamptz, nullable)
- created_at (timestamptz)
- updated_at (timestamptz)

Regras:
- proposta é artefato comercial/documental de uma oportunidade
- `negocio_id` deve ser obrigatório nas novas implementações
- `lead_id` permanece como apoio de consulta, mas deve refletir o mesmo lead de `negocio_id`
- quando definido, `vencimento_em` representa a data-limite comercial para aceite da proposta

---

### negocio_partes
- id (uuid, PK)
- owner_id (uuid, FK profiles.id)
- negocio_id (uuid, FK negocios.id)
- papel (text, enum PAPEL_PARTE_NEGOCIO)
- tipo_pessoa (text, enum TIPO_PESSOA_NEGOCIO)
- razao_social (text, nullable)
- cnpj (text, nullable)
- cep (text, nullable)
- endereco (text, nullable)
- numero (text, nullable)
- complemento (text, nullable)
- bairro (text, nullable)
- cidade (text, nullable)
- uf (text, enum UF, nullable)
- pais (text, nullable)
- created_at (timestamptz)
- updated_at (timestamptz)

Regras:
- se `tipo_pessoa = JURIDICA`, `razao_social` e `cnpj` são obrigatórios
- se `tipo_pessoa = FISICA`, `razao_social` e `cnpj` devem ficar nulos

Índices:
- owner_id
- negocio_id
- papel

---

### negocio_parte_pessoas
- id (uuid, PK)
- owner_id (uuid, FK profiles.id)
- negocio_parte_id (uuid, FK negocio_partes.id)
- nome_completo (text)
- email (text)
- telefone (text)
- cpf (text)
- cep (text)
- endereco (text)
- numero (text)
- complemento (text, nullable)
- bairro (text)
- cidade (text)
- uf (text, enum UF)
- pais (text)
- created_at (timestamptz)
- updated_at (timestamptz)

Regras:
- pessoa física envolvida deve ter `nome_completo`, `email`, `telefone`, `cpf` e endereço completo
- para partes com `tipo_pessoa = FISICA`, deve existir ao menos uma pessoa vinculada
- para partes com `tipo_pessoa = JURIDICA`, esta tabela representa os responsáveis/representantes envolvidos na operação

---

### negocio_corretores
- id (uuid, PK)
- owner_id (uuid, FK profiles.id)
- negocio_id (uuid, FK negocios.id)
- nome (text)
- email (text, nullable)
- telefone (text, nullable)
- percentual_comissao (numeric, nullable)
- valor_comissao (numeric, nullable)
- vinculado_corretor_parceiro (boolean, default false)
- created_at (timestamptz)
- updated_at (timestamptz)

Regras:
- representa os corretores que participam da divisão da comissão da oportunidade
- quando o imóvel da oportunidade vier do bolsão com parceria, o corretor parceiro pode ser pré-vinculado (`vinculado_corretor_parceiro = true`)
- `percentual_comissao`, quando preenchido, deve ficar entre 0 e 100
- `valor_comissao`, quando preenchido, deve ser maior ou igual a 0

Índices:
- owner_id
- negocio_id

---

### atividades
- id (uuid, PK)
- owner_id (uuid, FK profiles.id)
- lead_id (uuid, FK leads.id) *(obrigatório)*
- negocio_id (uuid, FK negocios.id, nullable)
- categoria (text, enum CATEGORIA_ATIVIDADE)
- modelo (text, enum MODELO_ATIVIDADE)
- tipo (text, enum TIPO_ATIVIDADE) *(canal/formato da execução: ligação, WhatsApp, visita, tarefa interna etc.)*
- titulo (text)
- descricao (text, nullable)
- quando_em (timestamptz, nullable)
- concluida_em (timestamptz, nullable)
- status (text, enum STATUS_ATIVIDADE, default PENDENTE)
- created_at (timestamptz)
- updated_at (timestamptz)

Regra recomendada: se negocio_id preenchido, deve pertencer ao mesmo lead_id.
Regra obrigatória: modelo deve ser compatível com a categoria.
Observação de produto: categoria/modelo representam a intenção comercial da atividade; `tipo` continua representando o formato operacional do contato/execução.

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

---

## 11) Ayka (Créditos & Consumo)

### ayka_custos_acoes
- id (uuid, PK)
- acao_codigo (text, unique com modelo)
- modelo (text, unique com acao_codigo)
- custo_creditos (int, > 0)
- ativo (bool)
- created_at (timestamptz)
- updated_at (timestamptz)

---

### ayka_franquia_ciclos
- id (uuid, PK)
- owner_id (uuid, FK profiles.id)
- assinatura_id (uuid, FK assinaturas.id)
- plano_id (uuid, FK planos.id)
- ciclo_inicio (timestamptz)
- ciclo_fim (timestamptz)
- creditos (int, >= 0)
- created_at (timestamptz)
- unique (owner_id, assinatura_id, ciclo_inicio)

---

### ayka_creditos_lotes
- id (uuid, PK)
- owner_id (uuid, FK profiles.id)
- origem (text, enum AYKA_ORIGEM)
- creditos_total (int, > 0)
- creditos_disponiveis (int, 0..creditos_total)
- expira_em (timestamptz, nullable)
- franquia_ciclo_id (uuid, FK ayka_franquia_ciclos.id, nullable)
- compra_ref (text, nullable)
- created_at (timestamptz)
- updated_at (timestamptz)

Observação:
- créditos avulsos usam `origem = AVULSO` e vencimento de 180 dias.

---

### ayka_movimentos
- id (uuid, PK)
- owner_id (uuid, FK profiles.id)
- mov_tipo (text, enum AYKA_MOV_TIPO)
- origem (text, enum AYKA_ORIGEM)
- acao_codigo (text)
- modelo (text, nullable)
- quantidade (int, > 0)
- custo_creditos (int, > 0)
- lote_id (uuid, FK ayka_creditos_lotes.id, nullable)
- referencia_tipo (text, nullable)
- referencia_id (uuid, nullable)
- metadata (jsonb)
- created_at (timestamptz)

---

## 12) Publicação em Background (Empreendimentos)

### empreendimento_publicacao_jobs
- id (uuid, PK)
- owner_id (uuid, FK profiles.id)
- empreendimento_id (uuid, FK empreendimentos.id)
- status (text, enum STATUS_PUBLICACAO_EMPREENDIMENTO_JOB)
- tentativas (int, default 0)
- payload (jsonb) *(imagens/vídeos para vínculo e ordenação)*
- erro (text, nullable)
- started_at (timestamptz, nullable)
- finished_at (timestamptz, nullable)
- created_at (timestamptz)
- updated_at (timestamptz)
