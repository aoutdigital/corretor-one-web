# Motor de Formulários de Captação de Leads — V1

> Fonte de verdade para a primeira versão dos formulários públicos de captação do corretor.

## 1) Decisão de Produto

O Corretor.one terá um motor único de formulários públicos para gerar leads nas páginas do corretor.

Na V1, os formulários não criam cadastro de visitante, não exigem login e não usam `lead_briefings`. O visitante informa seus dados, o sistema cria um lead para o corretor e salva o contexto do formulário em um payload flexível.

Ficam para uma etapa futura:

- cadastro/login de visitantes do portal;
- briefings persistidos em `lead_briefings`;
- preferências por visitante;
- área logada do comprador/inquilino;
- automações avançadas por perfil de busca.

## 2) Objetivo

Criar um motor reutilizável para os CTAs públicos do corretor:

- capturar contatos de forma padronizada;
- associar o lead ao corretor (`owner_id`);
- associar o lead ao imóvel (`imovel_id`) quando o contexto exigir;
- salvar UTMs, URL de origem, página e intenção do formulário;
- permitir evolução futura sem criar um formulário isolado para cada CTA;
- preparar o lead para CRM, atividades, notificações e automações.

## 3) Formulários da V1

### `whatsapp_contact`

Uso:

- botão “Falar agora” no perfil;
- botão “Falar no WhatsApp” no imóvel;
- CTAs de contato direto.

Modo:

- modal curto;
- pode ou não ter imóvel associado.

Campos:

- nome;
- sobrenome;
- telefone;
- e-mail;
- mensagem.

Pós-submit:

- cria o lead;
- salva `form_key = whatsapp_contact`, `page_url`, `referrer`, UTMs e contexto em `form_payload`;
- depois abre o WhatsApp do corretor com mensagem contextual.

Quando tiver imóvel, a mensagem deve citar o código/título do imóvel. Quando não tiver, deve mencionar que o contato veio pelo perfil público.

### `property_info`

Uso:

- formulário aberto no card/sticky de conversão da página do imóvel.

Modo:

- inline;
- sempre associado a um imóvel.

Campos:

- nome;
- telefone;
- e-mail;
- mensagem.

Pós-submit:

- cria o lead;
- mostra confirmação na própria página.

### `visit_schedule`

Uso:

- botão “Agendar visita” na página do imóvel.

Modo:

- modal multistep;
- sempre associado a um imóvel.

Campos:

- data da visita;
- horário da visita;
- nome;
- sobrenome;
- telefone;
- e-mail;
- mensagem.

Regras:

- datas futuras;
- janela máxima de 14 dias corridos;
- horários entre 08:00 e 20:00;
- antecedência mínima de 4 horas para visita no mesmo dia;
- se o imóvel não permitir visita imediata, iniciar no dia seguinte;
- regras validadas no frontend e revalidadas no backend.

Pós-submit:

- cria o lead;
- exibe confirmação;
- futuramente pode criar atividade de visita no CRM.

Status de implementação:

- endpoint público aceita `form_key = visit_schedule`;
- valida imóvel obrigatório, data futura, janela de 14 dias, horário comercial e antecedência mínima;
- salva agenda em `leads.form_payload.visit`;
- não abre WhatsApp automaticamente.

### `curadoria`

Uso:

- CTAs “Pedir curadoria”, “Não encontrou o que procura?” e chamadas consultivas.

Modo:

- modal multistep;
- normalmente sem imóvel associado;
- pode ter imóvel associado quando nascer a partir de uma página de imóvel.

Objetivos:

- comprar;
- alugar;
- vender.

O campo objetivo aceita múltipla seleção.

Campos V1:

- objetivos;
- regiões/bairros de interesse;
- tipo de imóvel;
- faixa de valor;
- dormitórios;
- vagas;
- prazo;
- nome;
- sobrenome;
- telefone;
- e-mail;
- mensagem.

Na V1, todos os detalhes da curadoria entram em `leads.form_payload`. Não alimentar `lead_briefings` por enquanto.

## 4) Schema Atual e Ajuste Necessário

A tabela principal continua sendo `leads`.

Campos atuais relevantes:

- `owner_id`;
- `nome`;
- `email`;
- `telefone`;
- `telefone_e164`;
- `origem`;
- `mensagem`;
- `imovel_id`;
- `utm`;
- `status`;
- `aguardando_produto`;
- `created_at`;
- `updated_at`.

Para suportar o motor sem depender de `lead_briefings`, a V1 deve adicionar campos de contexto ao lead.

Migration sugerida:

```sql
alter table leads
  add column if not exists form_key text null,
  add column if not exists page_url text null,
  add column if not exists referrer text null,
  add column if not exists form_payload jsonb not null default '{}'::jsonb;

create index if not exists leads_owner_form_key_idx
  on leads (owner_id, form_key);

create index if not exists leads_form_payload_gin_idx
  on leads using gin (form_payload);
```

Uso dos campos:

- `form_key`: identifica o formulário (`whatsapp_contact`, `property_info`, `visit_schedule`, `curadoria`);
- `page_url`: URL pública onde o lead foi gerado;
- `referrer`: origem anterior quando disponível;
- `form_payload`: dados específicos do formulário, contexto, UTM expandida, imóvel, agenda e intenção.

`origem` deve usar `CORRETOR_ONE`.

`status` inicial deve ser `NOVO`.

## 5) Contexto do Formulário

Todo formulário deve receber contexto mínimo:

```ts
type LeadFormContext = {
  formKey: LeadFormKey;
  ownerId: string;
  imovelId?: string;
  imovelCodigo?: string;
  imovelTitulo?: string;
  imovelUrl?: string;
  corretorNickname: string;
  pageUrl: string;
  referrer?: string;
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    content?: string;
    term?: string;
  };
};
```

Regras:

- `ownerId` é obrigatório sempre;
- `imovelId` é obrigatório em `property_info` e `visit_schedule`;
- `imovelId` é opcional em `whatsapp_contact` e `curadoria`;
- `pageUrl` deve ser salvo sempre que possível;
- UTMs devem ser capturadas e salvas em `leads.utm` e/ou `form_payload.tracking`.

## 6) Mapeamento Para `leads`

Mapeamento base:

```ts
{
  owner_id: context.ownerId,
  nome: fullName,
  email: normalizedEmail,
  telefone: normalizedPhone,
  telefone_e164: phoneE164 ?? null,
  origem: "CORRETOR_ONE",
  mensagem: data.message,
  imovel_id: context.imovelId ?? null,
  utm: context.utm ?? null,
  status: "NOVO",
  form_key: context.formKey,
  page_url: context.pageUrl,
  referrer: context.referrer,
  form_payload: {
    form_key: context.formKey,
    submitted_at: now,
    context: {
      corretor_nickname: context.corretorNickname,
      imovel_codigo: context.imovelCodigo,
      imovel_titulo: context.imovelTitulo,
      imovel_url: context.imovelUrl
    },
    data: formSpecificData,
    tracking: context.utm
  }
}
```

## 7) Motor de Formulários

Estrutura sugerida:

```txt
lib/lead-forms/
  engine/
    form-types.ts
    form-registry.ts
    form-validation.ts
    form-mapping.ts
    visit-availability.ts
  configs/
    whatsapp-contact.ts
    property-info.ts
    visit-schedule.ts
    curadoria.ts
  services/
    create-public-lead.ts
    build-whatsapp-url.ts

app/[nickname]/_components/lead-forms/
  lead-cta-button.tsx
  lead-form-modal.tsx
  lead-form-inline.tsx
  form-step-renderer.tsx
  field-renderer.tsx
  visit-calendar.tsx
```

Cada formulário deve ser configurado no registry:

```ts
type LeadFormConfig = {
  formKey: LeadFormKey;
  title: string;
  mode: "modal" | "inline";
  requiresImovel: boolean;
  steps: LeadFormStep[];
  afterSubmit: "open_whatsapp" | "show_success" | "none";
};
```

## 8) Validação

Toda validação importante deve existir no frontend e no backend.

Regras gerais:

- nome obrigatório, mínimo 2 caracteres;
- telefone obrigatório, normalizado para dígitos;
- e-mail obrigatório, lowercase;
- mensagem com limite editorial de 1000 caracteres;
- honeypot invisível para spam;
- bloquear duplo clique e reenvio enquanto estiver salvando.

Regras especiais:

- `property_info` e `visit_schedule` exigem `imovel_id`;
- `visit_schedule` revalida data, horário, janela de 14 dias, horário comercial e antecedência;
- `curadoria` exige pelo menos um objetivo.

## 9) Notificações

Notificações não devem ficar amarradas diretamente ao componente do formulário.

O formulário cria o lead. A criação do lead dispara um evento. O bloco de notificações escuta esse evento e decide o que enviar.

Modelo recomendado:

```txt
Formulário público
  -> createPublicLead
  -> insert leads
  -> registra evento lead_created
  -> Notification Engine processa o evento
  -> envia e-mail, WhatsApp interno, push ou cria tarefa
```

### 9.1) Por Que Não Amarrar No Formulário

Se cada formulário enviar sua própria notificação, teremos lógica duplicada e difícil de evoluir.

Com eventos:

- qualquer fonte de lead pode notificar;
- é possível mudar canais sem mexer no formulário;
- fica mais fácil fazer retry;
- dá para adicionar regras por corretor/plano;
- dá para registrar histórico de entrega.

### 9.2) Evento Mínimo

Evento interno sugerido:

```ts
type LeadCreatedEvent = {
  eventType: "lead_created";
  eventKey: string;
  leadId: string;
  ownerId: string;
  formKey: LeadFormKey;
  imovelId?: string | null;
  createdAt: string;
};
```

`eventKey` deve permitir deduplicação.

### 9.3) Implementação V1

Na V1, o caminho mais simples é registrar o evento após criar o lead na mesma Server Action/serviço.

Opções:

1. Inserir em uma tabela `notification_events` ou `event_outbox`;
2. Processar de forma síncrona apenas para notificações simples;
3. Evoluir depois para worker/cron/retry.

Recomendação:

- criar uma outbox simples antes de integrar canais externos;
- não usar trigger de banco como primeira opção para regra de produto complexa;
- trigger de banco pode ser usada futuramente para garantia operacional, mas a regra de negócio deve viver no serviço da aplicação.

### 9.4) Canais Futuros

Canais previstos:

- e-mail para o corretor;
- WhatsApp interno para o corretor;
- notificação no app;
- criação de atividade no CRM;
- webhook interno;
- eventos de analytics.

## 10) Segurança e Antispam

V1 deve ter:

- honeypot;
- normalização e sanitização de campos;
- rate limit por IP/sessão quando possível;
- bloqueio de submissões idênticas em curto período;
- consentimento simples no rodapé do formulário:

```txt
Ao enviar, você autoriza o corretor a entrar em contato pelos canais informados.
```

## 11) UX

Premissas:

- mobile-first;
- modal curto;
- multistep apenas quando necessário;
- botões claros;
- estado de loading;
- mensagem de sucesso;
- erro visível no modal/inline;
- foco acessível;
- fechamento sem quebrar a página.

Microcopy base:

- WhatsApp: “Antes de abrir o WhatsApp, deixe seus dados para eu entender melhor seu atendimento.”
- Curadoria: “Conte rapidamente o que você procura. Eu preparo uma seleção mais alinhada ao seu momento.”
- Agendar visita: “Escolha uma data e horário para visitar este imóvel. Eu confirmo a disponibilidade com você.”
- Mais informações: “Quer saber mais sobre este imóvel? Envie seus dados e eu entro em contato.”

Comunicação pública deve falar na primeira pessoa, como se o corretor estivesse falando com o visitante.

## 12) Critérios de Aceite

A V1 estará pronta quando:

- os quatro formulários estiverem registrados no motor;
- `property_info` salvar lead inline na página do imóvel;
- `whatsapp_contact` salvar lead antes de abrir o WhatsApp;
- `visit_schedule` exigir imóvel e validar agenda no backend;
- `curadoria` salvar objetivos e preferências em `form_payload`;
- todo lead tiver `owner_id`;
- leads de imóvel tiverem `imovel_id`;
- UTMs e URL de origem forem salvas;
- erros e loading estiverem claros;
- o serviço de criação de lead for único;
- notificações estiverem desacopladas por evento/outbox, ainda que o envio real fique para a etapa seguinte.

## 13) Fases de Implementação

### Fase 1 — Base

- migration dos campos em `leads`;
- tipos do motor;
- registry;
- validação base;
- serviço `createPublicLead`.

### Fase 2 — Formulários Essenciais

- `property_info` inline;
- `whatsapp_contact` modal;
- pós-submit com WhatsApp.

### Fase 3 — Agenda

- `visit_schedule`;
- geração de slots;
- revalidação backend;
- confirmação visual.

### Fase 4 — Curadoria

- formulário multistep;
- objetivos múltiplos;
- payload de preferências;
- CTA “não encontrou o que procura?”.

### Fase 5 — Notificações

- tabela outbox/eventos;
- evento `lead_created`;
- envio de e-mail/app notification;
- retry e histórico de entrega.
