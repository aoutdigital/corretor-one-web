# Regras de preenchimento (Excel)

## 1) `01_caracteristicas_catalogo.csv`
- `chave`: SCREAMING_SNAKE_CASE, estável (sem acento)
- `label_pt`: texto exibido na UI (com acento)
- `escopos`: use `IMOVEL`, `EMPREENDIMENTO` ou `IMOVEL|EMPREENDIMENTO`
- `tipos_uso`: `RESIDENCIAL`, `COMERCIAL` ou `RESIDENCIAL|COMERCIAL`
- `tipos_imovel`: opcional. Use valores de `TIPO_IMOVEL` separados por `|` (ex.: `APARTAMENTO|CASA`). Vazio = todos.
- `subtipos_imovel`: opcional. Use valores de `SUBTIPO_IMOVEL` separados por `|` (ex.: `GARDEN|DUPLEX`). Vazio = todos.
- `categoria_ui`: ex. `Lazer`, `Segurança`, `Acabamentos`, `Serviços`, `Acessibilidade`
- `ordem`: inteiro para ordenação
- `ativo`: `true` ou `false`
- `sinonimos`: separados por `|` (opcional)

## 2) `02_integracao_provedores.csv`
- Cadastre os provedores ativos
- `codigo` deve ser estável (ex.: `ZAP`)

## 3) `03_caracteristicas_mapeamentos.csv`
- Uma linha por característica + provedor
- `caracteristica_chave` deve existir na planilha 01
- `provedor_codigo` deve existir na planilha 02
- `external_key`, `external_label`, `xml_path` conforme layout oficial do provedor
- `valor_verdadeiro`/`valor_falso` quando o provedor usar flags
- `transformacao`: regra livre (ex.: lower, trim, map_bool)

## Como me devolver
1. Preencha os 3 CSVs
2. Pode manter em CSV mesmo
3. Me envie os arquivos e eu gero:
   - migration SQL completa
   - seed inicial
   - constraints/índices
   - adaptação da UI para leitura do catálogo
