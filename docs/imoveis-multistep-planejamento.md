# Multistep de Cadastro de Imóvel — Planejamento (V3)

Status: em definição funcional (pré-implementação)  
Escopo: `app/imoveis/novo` + reaproveitamento em `app/imoveis/[id]`  
Base: `docs/data-model.md`, `docs/enums.md`, `docs/rotas.md`

---

## 1) Diretriz estrutural (fechado)

Vamos tratar igual ao empreendimento:

- ao abrir `novo`, já criamos o imóvel no banco com `status = RASCUNHO`;
- esse imóvel ganha `id` imediatamente;
- enquanto estiver em `RASCUNHO`, deve abrir no multistep;
- após sair de rascunho (ex.: publicado/pausado), abre na tela de edição padrão.

Fluxo técnico proposto:

1. `POST /api/imoveis` mínimo (owner + status rascunho + dados iniciais da etapa).
2. Redireciona para `app/imoveis/novo?imovel={id}`.
3. Autosave por etapa no próprio `imoveis` (sem tabela paralela de rascunho para imóvel).

---

## 2) Pergunta-chave inicial (fechado)

## Etapa 1 — Contexto do imóvel

Pergunta:
- Este imóvel pertence a um empreendimento?

Opções:
- `SIM`
- `NÃO`

Quando `SIM`:

- abrir seleção de empreendimentos com busca rápida (estilo listagem):
  - filtros por `nome`, `endereço`, `bairro`, `cidade`;
  - card simples com: foto/capa, nome, endereço completo, status;
  - listar somente empreendimentos `PUBLICADO` ou `PAUSADO`;
- botão visível: `Criar novo empreendimento`;
- após selecionar empreendimento, perguntar tipologia:
  - ex.: `Apartamento > Padrão`, `Apartamento > Garden` etc.;
- ao escolher tipologia:
  - verificar se existe `empreendimento_tipos` cadastrado para essa tipologia;
  - se existir, pré-preencher dados do imóvel com base no tipo (área, dormitórios, suítes, banheiros, vagas, etc., quando aplicável).

Quando `NÃO`:
- segue fluxo de imóvel avulso.

---

## 3) Etapa 2 — Localidade (fechado)

## 2A) Com empreendimento

Exibir endereço do empreendimento formatado (somente leitura) e permitir:

- `endereco_complemento` (opcional),
- `andar` (opcional),
- `ultimo_andar` (opcional),
- toggle: `mostrar andar no anúncio`.

Regra de UX:
- para tipologia `TÉRREO` ou `GARDEN`, esconder/desabilitar “mostrar andar no anúncio”.

## 2B) Sem empreendimento

Copiar módulo de localidade do cadastro de empreendimento:

- busca Google Places,
- preenchimento de `logradouro`, `numero`, `bairro`, `cidade`, `estado`, `cep`,
- persistência de `lat`, `lng`, `address_json`, `geolocacao_id`.

---

## 4) Etapa 3 — Dados do imóvel (fechado no produto)

Campos solicitados:

- `area_total`
- `area_util`
- `dormitorios`
- `suites`
- `banheiros`
- `lavabos`
- `salas`
- `cozinhas`
- `vagas`
- `tipos de vaga` (checkbox moderno)

Bloco de terreno (somente onde fizer sentido):

- `area_terreno`
- medidas:
  - `frente`
  - `fundo`
  - `lateral_1`
  - `lateral_2`

Regra:
- para apartamentos e tipologias sem terreno, ocultar bloco de terreno.
- para terreno/casa/galpão/prédio inteiro, habilitar bloco conforme matriz de aplicabilidade.

Regra adicional de pré-preenchimento:
- quando o imóvel estiver vinculado a empreendimento e tipologia selecionada tiver cadastro em `empreendimento_tipos`, sugerir automaticamente:
  - `area_privativa -> area_util`
  - `dormitorios`, `suites`, `banheiros`, `vagas`
- corretor pode ajustar antes de salvar a etapa.

---

## 5) Etapa 4 — Negociação (fechado no produto)

Opções:

- `Venda`
- `Aluguel`
- `Aluguel e Venda`

### 4A) Bloco principal de negociação

Campos:

- `tipo_negociacao` (`VENDA`, `ALUGUEL`, `VENDA_E_ALUGUEL`)
- `valor_venda` (máscara monetária BR sem decimal; milhar com `.`)
- `valor_aluguel` (mesma regra)
- `comissao_locacao` (texto livre de comissão de aluguel, ex.: `Primeiro aluguel`)
- `comissao_venda_percentual` (percentual, ex.: 6,00%)
- `minimo_aceito_em_maos` (monetário, quando houver venda)
- `aceita_permuta` (check)
- `descricao_permuta` (obrigatória quando `aceita_permuta = true`)

### 4B) Captação com corretor parceiro

Campos:

- `captacao_corretor_parceiro` (check)
- `corretor_parceiro_nome`
- `corretor_parceiro_telefone`
- `corretor_parceiro_email`
- `comissao_captador_percentual`
- `comissao_vendedor_percentual`

Regra:
- se o imóvel veio do bolsão, carregar essas condições automaticamente.

### 4C) Exclusividade (somente quando NÃO veio do bolsão)

Condição:
- se `veio_do_bolsao = true`, este bloco não aparece para edição (somente leitura do que veio do bolsão).

Campos:

- `exclusividade` (sim/não)
- `exclusividade_data_vencimento`
- `exclusividade_observacoes`
- `disponibilizar_no_bolsao_parceria` (futuro)
- `comissao_captador_percentual`
- `comissao_vendedor_percentual`
- `outras_comissoes_percentual`
- `aceite_corretor_exclusivo` (check):
  - `Eu assumo que sou o corretor exclusivo desse imóvel`
- `regra_geral_exclusividade` (texto curto)

### 4D) Parceria com outros corretores

Campos:

- `aceita_parceria_status` (tri-state):
  - `SIM`
  - `NAO`
  - `SOB_ANALISE`
- `divisao_comissao_parceria` (campo livre)
- `corretor_parceiro_nome` e `corretor_parceiro_telefone` (quando aplicável)

Regra:
- se o imóvel foi captado via bolsão, condições de parceria podem vir pré-carregadas.

Campo derivado (somente edição):

- `ganho_potencial` (calculado; não editável no multistep)
  - exibição apenas em `app/imoveis/[id]`
  - cálculo final será definido na especificação técnica (não persistir como input manual).

Comportamento:

- `Venda`: exige `valor_venda`.
- `Aluguel`: exige `valor_aluguel`.
- `Aluguel e Venda`: exige ambos.
- `comissao_venda_percentual` e `minimo_aceito_em_maos` aplicáveis quando houver venda.
- `descricao_permuta` obrigatória quando `aceita_permuta = true`.

---

## 6) Etapa 5 — Ciência do anúncio por ambientes (opcional, recomendado)

Objetivo:
- enriquecer o anúncio com dados estruturados por ambiente;
- melhorar a qualidade dos textos, filtros e SEO;
- manter etapa opcional para não travar cadastro rápido.

## 5A) Dormitórios (detalhado)

Fluxo:

1. Perguntar quantidade de dormitórios.
2. Se houver tipologia vinculada, sugerir valor inicial.
3. Abrir X linhas conforme quantidade informada.

Cada dormitório terá:

- `eh_suite` (check)
- `suite_principal` (check, apenas 1 no imóvel inteiro)
- se `eh_suite = true`, detalhar banheiro da suíte:
  - `banheiro_armarios` (check)
  - `banheiro_pia_dupla` (check)
  - `banheiro_box` (check)
- `ar_condicionado` (check)
- `closet` (check)
- `armarios_planejados` (check)
- `tem_cama` (check)
- `tem_tv` (check)
- `tem_varanda` (check)
- `persiana_tipo`:
  - `PADRAO`
  - `AUTOMATIZADA`
- `area_util_m2` (numérico)
- `tipo_piso`:
  - `PORCELANATO`
  - `CERAMICA`
  - `LAMINADO`
  - `VINILICO`
  - `MADEIRA`
  - `CIMENTO_QUEIMADO`
  - `PEDRA_NATURAL`
  - `OUTRO`

Regras:

- `suite_principal` só pode ser marcado se `eh_suite = true`.
- máximo de 1 `suite_principal` por imóvel.
- se esta etapa for preenchida, derivar automaticamente:
  - `dormitorios = quantidade de linhas`
  - `suites = quantidade de linhas com eh_suite = true`

## 5B) Cozinhas (detalhado)

Fluxo:

1. Perguntar quantidade de cozinhas.
2. Abrir X linhas conforme quantidade informada.

Cada cozinha terá:

- `tipo_cozinha`:
  - `AMERICANA`
  - `INTEGRADA`
  - `FECHADA`
  - `GOURMET`
  - `ILHA`
  - `CORREDOR`
  - `OUTRO`
- `armarios_planejados` (check)
- `fogao` (check)
- `forno` (check)
- `geladeira` (check)
- `microondas` (check)
- `bancada` (check)
- `tipo_bancada`:
  - `GRANITO`
  - `QUARTZO`
  - `MARMORE`
  - `PORCELANATO`
  - `SUPERFICIE_SOLIDA`
  - `ACO_INOX`
  - `MADEIRA`
  - `CONCRETO`
  - `OUTRO`
- `tipo_piso`:
  - `PORCELANATO`
  - `CERAMICA`
  - `LAMINADO`
  - `VINILICO`
  - `MADEIRA`
  - `CIMENTO_QUEIMADO`
  - `PEDRA_NATURAL`
  - `OUTRO`

Regras:

- se `bancada = false`, limpar `tipo_bancada`.
- se etapa for preenchida, `cozinhas = quantidade de linhas`.

## 5C) Salas (detalhado)

Fluxo:

1. Perguntar quantidade de salas.
2. Permitir seleção da sala principal.
3. Capturar tipologia/layout/piso/diferenciais para enriquecer anúncio.

Campos e catálogos:

- `qtd_salas` (numérico)
- `sala_principal_tipo`:
  - `ESTAR`
  - `JANTAR`
  - `TV`
  - `HOME_THEATER`
  - `LIVING_AMPLIADO`
  - `INTEGRADA_COM_VARANDA`
  - `INTEGRADA_COM_COZINHA`
  - `ESCRITORIO`
  - `OUTRO`
- `layout_sala_principal`:
  - `INTEGRADA`
  - `SEPARADA`
  - `CONCEITO_ABERTO`
  - `DOIS_AMBIENTES`
  - `TRES_AMBIENTES`
  - `OUTRO`
- `tipo_piso_sala`:
  - `PORCELANATO`
  - `CERAMICA`
  - `LAMINADO`
  - `VINILICO`
  - `MADEIRA`
  - `CIMENTO_QUEIMADO`
  - `PEDRA_NATURAL`
  - `OUTRO`
- `diferenciais_sala` (multi-select):
  - `PE_DIREITO_DUPLO`
  - `VARANDA_INTEGRADA`
  - `LAREIRA`
  - `AR_CONDICIONADO`
  - `ILUMINACAO_PLANEJADA`
  - `PAINEL_PLANEJADO`
  - `OUTRO`
- `area_sala_m2` (número livre)

Campos de saída simplificados solicitados:

- `qtd_salas` (numérico)
- `tipos_sala` (multi-select)
- `diferenciais_sala` (multi-select)

Regras:

- etapa opcional, porém recomendada;
- se `qtd_salas` informado e maior que zero, habilitar os campos complementares;
- `tipos_sala` deve conter ao menos 1 item quando `qtd_salas > 0`;

## 5D) Varandas (detalhado)

Fluxo:

1. Perguntar quantidade de varandas.
2. Abrir X linhas conforme quantidade informada.

Cada varanda terá:

- `tipo_varanda`:
  - `VARANDA`
  - `VARANDA_GOURMET`
  - `TERRACO_GOURMET`
- `tipo_piso`:
  - `PORCELANATO`
  - `CERAMICA`
  - `LAMINADO`
  - `VINILICO`
  - `MADEIRA`
  - `CIMENTO_QUEIMADO`
  - `PEDRA_NATURAL`
  - `OUTRO`
- `churrasqueira_tipo`:
  - `NAO_TEM`
  - `ELETRICA`
  - `GAS`
  - `CARVAO`
- `bancada` (check)
- `persiana_tipo`:
  - `PADRAO`
  - `AUTOMATIZADA`
- `fechada_com_vidro` (check)
- `ilha` (check)
- `fogao` (check)
- `frigobar` (check)
- `chopeira` (check)
- `tem_tv` (check)
- `area_m2` (numérico, opcional)

Regras:

- etapa opcional;
- se etapa for preenchida, total de varandas será derivável pela quantidade de linhas;
- como os dados são estruturados em `jsonb`, novos atributos poderão ser expandidos sem quebrar as etapas anteriores.
- `qtd_salas` deve ser inteiro não negativo.

---

## 7) Etapas seguintes (fechado no produto)

## Etapa 6 — Características do imóvel

Padrão visual/UX igual ao módulo de características de empreendimento, porém:

- usar somente catálogo de `CARACTERISTICA_IMOVEL`;
- sem misturar características de condomínio/empreendimento.

## Etapa 7 — Descrição do anúncio (Ayka)

Campos:

- `descricao` (rich text)
- ação `Gerar descrição com Ayka`

Regras:

- prompt específico para anúncio de imóvel (não reutilizar prompt de empreendimento);
- usar contexto do imóvel (tipo, negociação, endereço, ambientes, características e valores);
- manter regra de contagem de caracteres para qualidade editorial;
- corretor pode editar manualmente após geração.

## Etapa 8 — Mídias

Padrão 100% igual ao módulo de mídias do imóvel.

Condição extra quando `empreendimento_id` estiver preenchido:

- exibir resumo das imagens do empreendimento no topo da etapa:
  - mostrar até 3 thumbs;
  - na terceira thumb, exibir badge/mensagem com total de imagens do empreendimento (ex.: `+12 fotos do empreendimento`);
- isso é apenas resumo visual de referência (não substitui a galeria do imóvel automaticamente).

## Etapa 9 — Cadastro de contatos do imóvel

Objetivo:
- centralizar contatos operacionais/comerciais do imóvel no fluxo de cadastro;
- reduzir retrabalho no CRM e nas visitas.

Contatos tratados nesta etapa:
- `Proprietário`
- `Inquilino` (condicional, conforme ocupação)
- `Administrador(a)`
- `Zelador(a)`

### 9A) Proprietário

Campos mínimos:
- `celular`
- `email`

Regra de deduplicação:
- ao informar telefone/email, buscar contato existente do corretor;
- se encontrar, exibir dados e permitir:
  - `Associar contato existente`, ou
  - `Continuar com novo cadastro` (somente se dados forem realmente diferentes após normalização).

### 9B) Ocupação do imóvel

Campo:
- `ocupacao_imovel` (enum planejado):
  - `PROPRIETARIO_RESIDE_NO_IMOVEL`
  - `IMOVEL_DESOCUPADO`
  - `IMOVEL_COM_INQUILINO`

Regras:
- se `IMOVEL_COM_INQUILINO`, abrir bloco de cadastro/associação de inquilino com a mesma lógica de deduplicação.
- se `IMOVEL_DESOCUPADO`, não exigir inquilino.

### 9C) Administrador(a) e Zelador(a)

Fluxo:
- permitir associar/cadastrar contatos de administradora e zeladoria para uso operacional.
- quando imóvel estiver vinculado a empreendimento, sugerir os contatos já vinculados ao empreendimento.

Observação de modelagem:
- hoje `PAPEL_CONTATO_IMOVEL` contempla apenas `PROPRIETARIO` e `INQUILINO`;
- para suportar vínculo direto de administrador/zelador ao imóvel, teremos que:
  - ampliar `PAPEL_CONTATO_IMOVEL`, ou
  - persistir esses dois papéis apenas em nível de empreendimento e referenciar no imóvel.

### 9D) Observação geral operacional

Campo:
- `observacoes_gerais` (texto livre)

Texto de apoio sugerido:
- `Descreva instruções importantes: onde está a chave, horários permitidos de visita, regras do condomínio, contatos de portaria e qualquer restrição de acesso.`

## Etapa 10 — Revisão e publicação

- checklist final;
- bloqueios de publicação;
- mudança de `status` para `PUBLICADO` quando aprovado.

---

## 8) Aderência ao contrato atual (importante)

O que já existe e encaixa:

- vínculo com empreendimento (`empreendimento_id`);
- endereço estruturado + geolocalização;
- campos principais de dimensão (`area_util`, `area_total`, `area_terreno`, `frente_metros`, `fundos_metros`, dormitórios, suítes, banheiros, lavabos, vagas);
- `aceita_permuta` (boolean);
- `exclusividade` (boolean);
- flags operacionais e mídias.

O que **não** existe hoje no schema de `imoveis` e exigirá migration:

- `salas` (int)
- `cozinhas` (int)
- `lateral_1_metros` (numeric)
- `lateral_2_metros` (numeric)
- `comissao_venda_percentual` (numeric)
- `comissao_locacao` (text)
- `minimo_aceito_em_maos` (numeric)
- `descricao_permuta` (text)
- `veio_do_bolsao` (boolean)
- `captacao_corretor_parceiro` (boolean)
- `corretor_parceiro_nome` (text)
- `corretor_parceiro_telefone` (text)
- `corretor_parceiro_email` (text)
- `comissao_captador_percentual` (numeric)
- `comissao_vendedor_percentual` (numeric)
- `outras_comissoes_percentual` (numeric)
- `exclusividade_data_vencimento` (date)
- `exclusividade_observacoes` (text)
- `disponibilizar_no_bolsao_parceria` (boolean)
- `aceite_corretor_exclusivo` (boolean)
- `regra_geral_exclusividade` (text)
- `aceita_parceria_status` (enum tri-state)
- `divisao_comissao_parceria` (text)
- `qtd_salas` (int)
- `tipos_sala` (text[] enum)
- `diferenciais_sala` (text[] enum)
- `sala_principal_tipo` (text enum, opcional)
- `layout_sala_principal` (text enum, opcional)
- `area_sala_m2` (numeric, opcional)
- `ocupacao_imovel` (enum, opcional)
- `observacoes_gerais` (text, opcional)

Campo calculado:

- `ganho_potencial` não será campo editável no multistep; será calculado na edição.

Campos de “ciência do anúncio” também exigem nova modelagem.

Proposta técnica (aprovada): tabela única de ambientes

- `imovel_ambientes`
  - `id`, `owner_id`, `imovel_id`, `ordem`
  - `tipo_ambiente` (`DORMITORIO`, `COZINHA`, `SALA`, `VARANDA`, ...)
  - `principal` (bool)
  - `area_m2` (numeric, opcional)
  - `dados` (jsonb com schema por tipo)
  - `created_at`, `updated_at`

Motivo de usar tabela (e não coluna simples):
- estrutura repetível por quantidade de ambientes;
- validação mais robusta;
- melhor base para busca/filtros e geração inteligente de anúncio.

Regras chave:
- validar `dados` por `tipo_ambiente` no backend;
- garantir unicidade de ambiente principal por tipo (quando aplicável);
- derivar totais (`dormitorios`, `suites`, `cozinhas`, `qtd_salas`) a partir de `imovel_ambientes` quando houver dados.

Ponto de decisão de enum/modelagem:

- Hoje `FINALIDADE` no contrato está `COMPRAR | ALUGAR`.
- A etapa de negociação proposta exige `Venda | Aluguel | Aluguel e Venda`.
- Para suportar isso de forma limpa, proposta técnica é adicionar em `imoveis`:
  - `tipo_negociacao` (enum `TIPO_NEGOCIACAO`: `VENDA | ALUGUEL | VENDA_E_ALUGUEL`).
- parceria com outros corretores deve usar enum tri-state:
  - `aceita_parceria_status` (`SIM`, `NAO`, `SOB_ANALISE`).
- origem bolsão:
  - definir se será campo explícito (`veio_do_bolsao`) ou derivado de integração/origem.

Para contatos no imóvel:
- revisar enum `PAPEL_CONTATO_IMOVEL` caso a decisão seja vincular `ADMINISTRADORA` e `ZELADOR` diretamente ao imóvel.

---

## 9) Regras de validação por etapa (proposta)

Etapa 1:

- obrigatório responder se pertence a empreendimento;
- se `SIM`, `empreendimento_id` obrigatório e deve ser do mesmo owner;
- se `SIM`, tipologia obrigatória.

Etapa 2:

- com empreendimento: endereço bloqueado (snapshot), só campos da unidade;
- sem empreendimento: endereço completo obrigatório via place + campos normalizados.

Etapa 3:

- validar aplicabilidade por tipo (não permitir persistir campos incoerentes);
- normalizar campos não aplicáveis para `null`.

Etapa 4:

- validar coerência entre tipo de negociação e valores obrigatórios;
- máscara de moeda aplicada no frontend e validação numérica no backend.
- validar `comissao_venda_percentual` em faixa válida (ex.: > 0 e <= 100) quando aplicável.
- validar `minimo_aceito_em_maos` somente quando houver venda.
- validar `descricao_permuta` obrigatória quando `aceita_permuta = true`.
- validar campos do corretor parceiro quando `captacao_corretor_parceiro = true`.
- quando `veio_do_bolsao = true`, bloquear edição de campos de exclusividade local (usar condições importadas).
- quando `veio_do_bolsao = false` e `exclusividade = true`, exigir:
  - `exclusividade_data_vencimento`
  - `aceite_corretor_exclusivo`
- validar `aceita_parceria_status` em enum tri-state (`SIM`, `NAO`, `SOB_ANALISE`).

Etapa 5:

- etapa de ambientes é opcional;
- se preenchida, deve respeitar schema por `tipo_ambiente` e regras de unicidade (`suite_principal`, `principal`);
- totais podem ser derivados automaticamente dos ambientes detalhados.

Etapa 6:

- aceitar somente itens de `CARACTERISTICA_IMOVEL`.

Etapa 7:

- descrição pode ser manual ou gerada por Ayka;
- prompt do Ayka deve ser específico para imóvel.

Etapa 8:

- módulo idêntico ao de mídias do imóvel;
- quando vinculado a empreendimento, mostrar resumo visual das mídias do empreendimento.

Etapa 9:

- proprietário com telefone/email deve permitir deduplicação e associação;
- se `ocupacao_imovel = IMOVEL_COM_INQUILINO`, inquilino passa a ser obrigatório;
- observações gerais são opcionais, porém recomendadas.

Publicação:

- checklist final antes de mudar `status` para `PUBLICADO`.

---

## 10) Próximas decisões para fechar antes de codar

1. Confirmar modelagem de negociação com novo campo `tipo_negociacao` em `imoveis`.
2. Confirmar novos campos de schema da Etapa 3 e 4 (`salas`, `cozinhas`, laterais, permuta, bolsão, parceria, exclusividade e comissões).
3. Fechar matriz completa de aplicabilidade por `TIPO_IMOVEL` (incluindo galpão, prédio inteiro, hotel, fazenda, garagem).
4. Definir regra de cálculo do `ganho_potencial` na edição.
5. Definir checklist mínimo de publicação (ex.: mídia mínima, descrição mínima, localização validada, etc.).
6. Validar catálogo final de enums para ambientes (`tipo_piso`, `tipo_cozinha`, `tipo_bancada`, `tipo_sala`, `layout_sala`, `diferenciais_sala`) e incluir em `docs/enums.md`.
7. Detalhar prompt Ayka específico de imóvel em documento técnico próprio.
8. Confirmar modelagem de contatos de `ADMINISTRADORA` e `ZELADOR` no imóvel (ampliar `PAPEL_CONTATO_IMOVEL` ou herdar de empreendimento).
9. Definir enum e regra final de `ocupacao_imovel`.
10. Definir modelagem final de bolsão (`veio_do_bolsao` explícito vs derivado de origem/integração).

---

## 11) Matriz aprovada de tipo/subtipo

- RESIDENCIAL > APARTAMENTO > PADRAO
- RESIDENCIAL > APARTAMENTO > GARDEN
- RESIDENCIAL > APARTAMENTO > DUPLEX
- RESIDENCIAL > APARTAMENTO > TRIPLEX
- RESIDENCIAL > APARTAMENTO > COBERTURA_PADRAO
- RESIDENCIAL > APARTAMENTO > COBERTURA_DUPLEX
- RESIDENCIAL > APARTAMENTO > COBERTURA_TRIPLEX
- RESIDENCIAL > CASA > PADRAO
- RESIDENCIAL > CASA > SOBRADO
- RESIDENCIAL > CASA > GEMINADA
- RESIDENCIAL > CASA_DE_CONDOMINIO > PADRAO
- RESIDENCIAL > CASA_DE_CONDOMINIO > SOBRADO
- RESIDENCIAL > CASA_DE_CONDOMINIO > GEMINADA
- RESIDENCIAL > CASA_DE_VILA > PADRAO
- RESIDENCIAL > CASA_DE_VILA > SOBRADO
- RESIDENCIAL > KITNET_CONJUGADO > PADRAO
- RESIDENCIAL > STUDIO > PADRAO
- RESIDENCIAL > LOFT > PADRAO
- RESIDENCIAL > FLAT > PADRAO
- RESIDENCIAL > FAZENDA_SITIO_CHACARA > PADRAO
- RESIDENCIAL > LOTE_TERRENO > PADRAO
- RESIDENCIAL > GARAGEM > PADRAO
- COMERCIAL > ESCRITORIO > PADRAO
- COMERCIAL > ESCRITORIO > CONJUNTO_COMERCIAL
- COMERCIAL > ESCRITORIO > ANDAR_INTEIRO
- COMERCIAL > ESCRITORIO > MEIO_ANDAR
- COMERCIAL > PONTO_COMERCIAL_LOJA_BOX > LOJA_BOX
- COMERCIAL > SHOPPING > LOJA_BOX
- COMERCIAL > CASA_COMERCIAL > PADRAO
- COMERCIAL > GALPAO_DEPOSITO_ARMAZEM > PADRAO
- COMERCIAL > PREDIO_EDIFICIO_INTEIRO > PADRAO
- COMERCIAL > HOTEL_MOTEL_POUSADA > PADRAO
- COMERCIAL > SELF_STORAGE > PADRAO
- COMERCIAL > LOTE_TERRENO > PADRAO
