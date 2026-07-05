# Seed — Imóveis Relacionados

Script: `npm run seed:related-properties`

Objetivo: popular uma massa pequena e controlada para testar o motor de imóveis relacionados, carrosséis/listagens e regras de exclusão no portal público.

## Escopo

- Corretor alvo: `f682ca92-660b-40b9-b41b-33d8342b00c4`
- Prefixo de códigos: `SEED-REL-`
- Empreendimento criado/atualizado: `Living Nord View Seed`
- Imóvel base publicado:
  - código: `SEED-REL-BASE`
  - URL pública: `/thiagomafort/venda/seed-rel-apartamento-base-santana`

## Idempotência

O script pode ser executado mais de uma vez. Ele procura registros existentes por chaves determinísticas e atualiza os dados de seed em vez de duplicar:

- `geolocacoes.place_id`
- `empreendimentos.owner_id + slug_publico`
- `imoveis.owner_id + codigo`
- `midia.owner_id + storage_path`

O script não apaga registros.

## Casos Cobertos

Imóveis que devem disputar o ranking de relacionados para o imóvel base:

- `SEED-REL-EMP-01`: mesmo empreendimento, muito similar.
- `SEED-REL-EMP-02`: mesmo empreendimento, maior e mais caro.
- `SEED-REL-CEP-01`: mesmo CEP, sem empreendimento.
- `SEED-REL-BAIRRO-01`: mesmo bairro, outro CEP.
- `SEED-REL-CIDADE-01`: mesma cidade, outro bairro, forte por preço/área/atributos.
- `SEED-REL-CIDADE-02`: mesma cidade, outro bairro, forte por configuração.
- `SEED-REL-WEAK-01`: mesmo tipo e cidade, mas distante em preço/área para validar score baixo.

Controles que não devem aparecer nos relacionados do imóvel base:

- `SEED-REL-TYPE-CONTROL`: mesmo bairro, mas tipo `CASA`.
- `SEED-REL-RENT-CONTROL`: mesmo tipo, mas negociação `ALUGUEL`.
- `SEED-REL-DRAFT-CONTROL`: similar ao base, mas status `RASCUNHO`.

## Mídia

Cada imóvel publicado recebe uma capa em:

- `midia`
- `midia_relacoes`
- `imovel_midia_publica`

As URLs são externas e servem apenas para visualização em desenvolvimento. O seed respeita as FKs da biblioteca de mídia em vez de gravar imagem solta diretamente na tabela pública.

## Uso Esperado

1. Rodar `npm run seed:related-properties`.
2. Abrir `/thiagomafort/venda/seed-rel-apartamento-base-santana`.
3. Conferir se a seção de relacionados prioriza:
   - mesmo empreendimento;
   - mesmo CEP;
   - mesmo bairro;
   - mesma cidade com alta compatibilidade.
4. Conferir se controles de tipo, finalidade e status não aparecem.
