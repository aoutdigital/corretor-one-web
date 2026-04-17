# Oportunidades — Fluxo Proposto (Rascunho)

Status: rascunho de produto  
Escopo: documento de trabalho para revisão futura  
Contrato oficial: ainda **não** incorporado em `docs/data-model.md` / `docs/enums.md`

## 1. Contexto

Hoje o CRM já possui:

- `leads`
- `negocios`
- `propostas`
- `atividades`
- `timeline_eventos`

No estado atual, `negocios` ainda está simples demais para representar uma oportunidade imobiliária com profundidade comercial, financeira e jurídica.

Este rascunho organiza a próxima evolução do fluxo.

## 2. Princípios

- A **oportunidade** nasce a partir de um lead.
- A oportunidade pode nascer:
  - com um imóvel associado
  - sem imóvel associado
- O corretor precisa conseguir abrir a oportunidade rápido.
- O cadastro de compradores e vendedores **não** entra no popup inicial.
- O fluxo jurídico precisa existir como etapa própria.
- A forma de pagamento precisa ser estruturada desde a abertura.

## 2.1. Decisões já alinhadas

Estas decisões já foram validadas no produto:

- `negocios` continua sendo a base técnica da oportunidade.
- O nome de produto para o corretor deve ser **Oportunidade**.
- A abertura da oportunidade deve ser rápida.
- O popup inicial mostra imóveis associados e permite seguir sem imóvel.
- O corretor informa valor, observações e composição financeira no momento da abertura.
- Compradores e vendedores entram depois, dentro da oportunidade.
- O jurídico é fase da oportunidade, não entidade separada.
- `propostas` continua como artefato comercial/documental ligado à oportunidade.

## 2.2. Insight principal de produto

Nem toda oportunidade imobiliária é da mesma natureza.

Existe uma diferença importante entre:

- negociação de **venda**
- negociação de **locação**
- oportunidade de **captação**

Se tentarmos encaixar tudo no mesmo popup e no mesmo cabeçalho de dados, a experiência vai ficar pesada e conceitualmente torta.

### Leitura recomendada

- **Venda**: negociação com valor de transação, composição financeira, jurídico e partes.
- **Locação**: negociação mais simples, normalmente sem FGTS/financiamento como composição da compra.
- **Captação**: relação com proprietário, entrada de produto, avaliação e mandato, não uma compra imediata.

## 2.3. Recomendação de escopo para v1

A primeira versão da oportunidade deve focar em **venda**.

Motivos:

- é o cenário que mais precisa de composição financeira
- é o cenário que mais precisa de fase jurídica e subfases
- é o cenário que mais precisa de cadastro formal de compradores e vendedores

### Consequência prática

Na v1:

- oportunidade de venda é o fluxo principal
- locação pode continuar em fluxo simplificado depois
- captação deve virar fluxo próprio em etapa futura

### Regra de produto sugerida

Leads com objetivo `VENDER` não devem cair automaticamente no mesmo fluxo de oportunidade de venda do comprador.  
Esse caso tende a pedir um fluxo específico de captação.

## 3. Leitura recomendada do domínio

### Lead

Representa a pessoa/empresa em atendimento.

### Oportunidade

Representa uma negociação concreta.

### Proposta

Representa um documento, versão comercial ou formalização ligada à oportunidade.

Recomendação:

- `lead.status` continua sendo estágio do relacionamento
- `negocio` passa a ser a base da oportunidade
- `proposta` continua como camada documental/comercial ligada ao negócio
- juridico deve morar dentro da oportunidade

## 4. Problema do modelo atual

Hoje `negocios.etapa` usa valores que se parecem mais com estágio de lead do que com fase de oportunidade:

- `NOVO`
- `ABERTO`
- `EM_ATENDIMENTO`
- `QUALIFICADO`
- `OPORTUNIDADE`
- `CLIENTE`
- `DESQUALIFICADO`

Isso está conceitualmente torto para uma negociação imobiliária.

Recomendação futura:

- manter `status_lead` no lead
- transformar o negócio em oportunidade com fases próprias

## 5. Fluxo de abertura da oportunidade

### Entrada

Origem esperada:

- botão `Criar oportunidade` na tela do lead

### Popup de abertura

O popup deve mostrar:

- imóveis já associados ao lead
- ação `Seguir sem imóvel associado`

### Campos mínimos do popup

- imóvel associado ou sem imóvel
- valor inicial da oportunidade
- observações
- composição financeira

### Cenário A: com imóvel associado

O corretor escolhe um dos imóveis associados e informa:

- valor da oportunidade/proposta inicial
- observações
- composição da forma de pagamento

### Cenário B: sem imóvel associado

O corretor segue sem imóvel e cria uma oportunidade “aberta”, útil para:

- demanda sem produto ainda
- negociação em construção
- operação de busca/captação antes da definição do ativo final

### Regra de UX

O popup inicial deve ser leve e rápido.  
Compradores, vendedores, documentos e detalhes jurídicos entram depois, dentro da oportunidade.

### Regra de negócio recomendada

- oportunidade pode nascer sem imóvel
- oportunidade entra em `JURIDICO` apenas quando já houver imóvel principal
- oportunidade só pode ser `GANHO` com imóvel principal definido

## 6. Forma de pagamento

No momento da abertura, a oportunidade deve permitir compor a origem dos recursos:

- Recursos próprios
- Financiamento
- FGTS
- Outros recursos

### Regra

A composição precisa fechar 100%.

### Escopo recomendado

Esta composição faz sentido na **venda**.  
Para locação, esse bloco não deve ser obrigatório e provavelmente deve ficar fora do fluxo inicial.

### Recomendação de modelagem

Para evitar duplicidade entre percentual e valor:

- o usuário compõe percentuais na UI
- o sistema calcula os valores a partir do valor da oportunidade
- o banco persiste os valores finais

Campos previstos:

- `financiamentovalor`
- `recursopropriovalor`
- `fgtsvalor`
- `outrosrecursosvalor`

Regra de consistência recomendada:

- soma dos quatro campos = valor da oportunidade

## 7. Fases da oportunidade

Fases principais propostas:

- `NEGOCIACAO`
- `JURIDICO`
- `PERDIDO`
- `GANHO`

### Observação

`PERDIDO` e `GANHO` funcionam como estados finais.

### Regra recomendada

- `NEGOCIACAO` e `JURIDICO` são fases ativas
- `PERDIDO` e `GANHO` são fases finais
- ao entrar em `PERDIDO`, vale avaliar motivo estruturado em etapa futura

## 8. Subfases do jurídico

Subfases propostas:

- `DOCUMENTOS_RECEBIDOS`
- `ANALISE_DOCUMENTAL`
- `PENDENCIA_DOCUMENTAL`
- `DOCUMENTACAO_APROVADA`
- `MINUTA_DE_CONTRATO_ENVIADA`
- `MINUTA_DE_CONTRATO_APROVADA`
- `ASSINATURA_AGENDADA`
- `CONTRATO_ASSINADO`
- `REGISTRO_EM_CARTORIO`
- `REGISTRO_CONCLUIDO`

Regra:

- subfase só existe quando a fase principal for `JURIDICO`

## 9. Dados de compradores

Esses dados entram **depois** da abertura da oportunidade.

### Tipo de comprador

- Pessoa física
- Pessoa jurídica

### Se for pessoa jurídica

Cadastrar:

- CNPJ
- Endereço
- Razão social

### Pessoas físicas envolvidas

Campos obrigatórios:

- Nome completo
- Email
- CPF
- Endereço completo

## 10. Dados de vendedores

Esses dados também entram **depois** da abertura da oportunidade.

### Tipo de vendedor

- Pessoa física
- Pessoa jurídica

### Se for pessoa jurídica

Cadastrar:

- CNPJ
- Endereço
- Razão social

### Pessoas físicas envolvidas

Campos obrigatórios:

- Nome completo
- Email
- CPF
- Endereço completo

## 11. Estrutura recomendada de dados

### 11.1. Cabeçalho da oportunidade

Recomendação: aproveitar `negocios` como base da oportunidade, evoluindo o modelo.

Campos desejados no cabeçalho:

- `lead_id`
- `imovel_id` nullable
- `modalidade_oportunidade`
- `titulo`
- `valor_oportunidade`
- `observacoes`
- `fase_oportunidade`
- `subfase_juridico` nullable
- `financiamentovalor`
- `recursopropriovalor`
- `fgtsvalor`
- `outrosrecursosvalor`
- `perdido_em` nullable
- `ganho_em` nullable

### Modalidade recomendada

Mesmo que a v1 seja focada em venda, vale modelar desde já a modalidade da oportunidade:

- `VENDA`
- `LOCACAO`
- `CAPTACAO`

Isso evita misturar juridico de venda com locação e captação no mesmo trilho.

### 11.2. Partes da oportunidade

Recomendação: não colocar compradores/vendedores em colunas diretas de `negocios`.

Melhor caminho:

- uma tabela de partes da oportunidade
- uma tabela de pessoas físicas ligadas a cada parte

Estrutura sugerida:

#### oportunidade_partes

- `id`
- `negocio_id`
- `papel` (`COMPRADOR` | `VENDEDOR`)
- `tipo_pessoa` (`PF` | `PJ`)
- `nome_razao`
- `cpf_cnpj`
- `email`
- `endereco_json`
- `razao_social` nullable
- `created_at`
- `updated_at`

#### oportunidade_parte_pessoas

- `id`
- `parte_id`
- `nome_completo`
- `email`
- `cpf`
- `endereco_json`
- `created_at`
- `updated_at`

Essa separação atende:

- comprador PJ com representantes
- vendedor PJ com sócios/representantes
- operações com múltiplas pessoas físicas

## 12. Fluxo operacional recomendado

### Etapa 1: abrir oportunidade

Campos mínimos:

- imóvel associado ou não
- modalidade
- valor
- observações
- composição financeira

### Etapa 2: andar negociação

Dentro da oportunidade:

- atualizar fase
- registrar propostas
- registrar observações
- gerar atividades

### Etapa 3: entrar no jurídico

Quando a negociação avançar:

- mover fase para `JURIDICO`
- habilitar subfases
- começar cadastro de compradores e vendedores

### Etapa 4: concluir

Saídas finais:

- `GANHO`
- `PERDIDO`

## 13. Regras de produto recomendadas

- oportunidade pode existir sem imóvel
- ao associar imóvel depois, a oportunidade passa a ter “ativo principal”
- oportunidade com fase `JURIDICO` exige imóvel associado
- oportunidade com fase `GANHO` exige imóvel associado
- composição financeira não pode ficar inconsistente
- cadastro de partes não bloqueia abertura inicial

## 14. Ponto importante para retomada

Antes de implementar, precisamos decidir:

1. Se `negocios.etapa` será substituído por fase real de oportunidade ou se criaremos um novo campo.
2. Se a UI vai trabalhar com percentual de pagamento e o backend persistirá só valor.
3. Se `propostas` continua como entidade separada ou se parte do fluxo comercial ficará no próprio negócio.
4. Se a oportunidade sem imóvel pode depois ter múltiplos imóveis candidatos ou apenas um imóvel principal.
5. Se `PERDIDO` terá motivo estruturado, como já acontece em leads desqualificados.
6. Se `modalidade_oportunidade` entra já na primeira migration ou se fica implícita na v1.
7. Se leads com objetivo `VENDER` já entram em captação própria ou se aguardam fase futura.

## 15. Próximo passo sugerido

Na retomada, a ordem recomendada é:

1. revisar esse rascunho
2. decidir o modelo final de `negocios`
3. atualizar `docs/data-model.md`
4. atualizar `docs/enums.md`
5. desenhar o popup de abertura da oportunidade
6. só então partir para migration + backend + UI
