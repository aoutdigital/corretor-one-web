# Motor de Imóveis Relacionados

> Escopo: páginas públicas de imóvel no perfil do corretor, portal geral Corretor.one e futuras buscas/listagens.

## Objetivo

A seção de imóveis relacionados deve ajudar o visitante a continuar uma jornada coerente, sem apresentar opções aleatórias que possam frustrar a intenção de contato.

Quando não houver imóveis suficientemente próximos, a experiência deve priorizar CTA consultivo:

> Não é exatamente o que você procura? Me chama que eu encontro opções para você.

## Princípios

- O motor deve ser independente da página.
- A página apenas informa imóvel base, escopo e limite.
- A busca deve filtrar no banco antes de pontuar em memória.
- O score deve ser explicável e baseado em fatores objetivos.
- Finalidade e tipologia são filtros fortes.
- Localização define a hierarquia inicial.
- Preço, área e composição refinam a relevância.
- Imóveis com score baixo não devem ser exibidos como relacionados.

## Escopos

### Perfil do corretor

No perfil público do corretor, o motor deve buscar apenas imóveis do mesmo `owner_id`.

Se não houver imóveis bons, não deve puxar imóveis de outros corretores. O fallback deve ser CTA de atendimento.

### Portal geral

No portal geral Corretor.one, o motor poderá buscar em todo o estoque publicado, preservando a prioridade:

1. imóveis do mesmo corretor;
2. imóveis de outros corretores com alta similaridade;
3. fallback CTA quando a similaridade for baixa.

## Filtros fortes

Todo candidato deve respeitar:

- `status = PUBLICADO`
- `slug_publico IS NOT NULL`
- `id != imóvel base`
- mesma finalidade da página:
  - venda: `tipo_negociacao IN (VENDA, VENDA_E_ALUGUEL)` ou `finalidade = COMPRAR`
  - aluguel: `tipo_negociacao IN (ALUGUEL, VENDA_E_ALUGUEL)` ou `finalidade = ALUGAR`
- mesma tipologia:
  - `tipo` igual ao imóvel base;
  - quando `subtipo` existir no imóvel base, `subtipo` também deve ser igual.

## Camadas de localização

O motor busca candidatos em camadas, sempre nessa ordem:

| Camada | Regra | Pool inicial |
|---|---|---:|
| Mesmo empreendimento | `empreendimento_id` igual | até 12 |
| Mesmo CEP | `cep` igual | até 12 |
| Mesmo bairro | `bairro`, `cidade` e `estado` iguais | até 20 |
| Mesma cidade | `cidade` e `estado` iguais | até 30 |

Duplicados são removidos mantendo a camada mais forte encontrada primeiro.

## Score de localização

| Camada | Score |
|---|---:|
| Mesmo empreendimento | 100 |
| Mesmo CEP | 85 |
| Mesmo bairro | 65 |
| Mesma cidade | 35 |

## Score de área útil

Comparação:

```txt
diferença = abs(area_candidato - area_base) / area_base
```

| Diferença | Score área |
|---|---:|
| 0% a 10% | 100 |
| >10% a 20% | 80 |
| >20% a 30% | 55 |
| >30% a 40% | 30 |
| acima de 40% | 0 |

Para imóveis até 50m², a comparação deve preservar uma tolerância mínima de 8m² para evitar rigidez excessiva em imóveis pequenos.

## Score de preço

O preço comparado depende da finalidade:

- venda: `preco_venda`
- aluguel: `preco_locacao`

### Venda até R$ 1,5 milhão

| Diferença | Score preço |
|---|---:|
| 0% a 5% | 100 |
| >5% a 10% | 85 |
| >10% a 15% | 65 |
| >15% a 20% | 45 |
| >20% a 30% | 20 |
| acima de 30% | 0 |

### Venda acima de R$ 1,5 milhão

| Diferença | Score preço |
|---|---:|
| 0% a 10% | 100 |
| >10% a 15% | 80 |
| >15% a 25% | 55 |
| >25% a 35% | 25 |
| acima de 35% | 0 |

### Locação

| Diferença | Score preço |
|---|---:|
| 0% a 5% | 100 |
| >5% a 10% | 85 |
| >10% a 15% | 65 |
| >15% a 25% | 35 |
| acima de 25% | 0 |

## Scores de composição

### Dormitórios

| Diferença | Score |
|---|---:|
| Mesmo número | 100 |
| Diferença de 1 | 55 |
| Diferença de 2 ou mais | 0 |

### Suítes

| Diferença | Score |
|---|---:|
| Mesmo número | 100 |
| Diferença de 1 | 50 |
| Diferença de 2 ou mais | 0 |

### Vagas

| Caso | Score |
|---|---:|
| Mesmo número | 100 |
| Candidato tem mais vagas | 80 |
| Candidato tem 1 vaga a menos | 35 |
| Base tem vaga e candidato tem 0 | 0 |
| Base tem 0 e candidato tem vaga | 85 |

## Score de recência

Usar `publicado_em` quando existir; cair para `updated_at` quando necessário.

| Recência | Score |
|---|---:|
| Até 15 dias | 100 |
| 16 a 45 dias | 80 |
| 46 a 90 dias | 55 |
| Mais de 90 dias | 30 |

## Peso por camada

| Camada | Localização | Preço | Área | Dorms | Suítes | Vagas | Recência |
|---|---:|---:|---:|---:|---:|---:|---:|
| Mesmo empreendimento | 45 | 10 | 10 | 10 | 6 | 6 | 13 |
| Mesmo CEP | 40 | 15 | 15 | 10 | 5 | 5 | 10 |
| Mesmo bairro | 30 | 25 | 20 | 10 | 5 | 5 | 5 |
| Mesma cidade | 20 | 35 | 30 | 5 | 3 | 5 | 2 |

## Exibição

| Score final | Ação |
|---|---|
| 70+ | Mostrar como relacionado |
| 50 a 69 | Usar apenas para completar slots quando faltarem opções melhores |
| abaixo de 50 | Não mostrar |

Limite inicial da seção:

- 4 imóveis.

Limite por camada:

- mesmo empreendimento: até 2;
- mesmo CEP: até 2;
- mesmo bairro: até 2;
- mesma cidade: até 1.

## Performance

V1 deve usar:

- queries pequenas por camada;
- deduplicação por `id`;
- score em memória apenas nos candidatos retornados;
- limite máximo prático de cerca de 70 candidatos antes do score.

Índices recomendados:

- `(owner_id, status, tipo, subtipo, tipo_negociacao)`
- `(owner_id, status, empreendimento_id)`
- `(owner_id, status, cep)`
- `(owner_id, status, cidade, estado, bairro)`
- `(status, tipo, subtipo, cidade, estado)` para portal geral
- `preco_venda`, `preco_locacao`, `area_util`, `dormitorios`, `suites`, `vagas`

## Cache e pré-cálculo

A interface do motor deve permitir cache por chave:

```txt
related-properties:{scope}:{imovel_id}:{limit}
```

V1 pode operar sem cache persistente, porque as queries são pequenas.

V2, se o volume exigir, pode criar uma tabela materializada:

```txt
imoveis_relacionados_cache
- imovel_id
- related_imovel_id
- scope
- score
- layer
- reasons
- updated_at
```

Recalcular em background quando mudar:

- status;
- preço;
- área;
- tipologia;
- finalidade;
- localização;
- empreendimento;
- dormitórios/suítes/vagas.
