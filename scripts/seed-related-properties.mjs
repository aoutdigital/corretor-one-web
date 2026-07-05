import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const OWNER_ID = "f682ca92-660b-40b9-b41b-33d8342b00c4";
const SEED_PREFIX = "SEED-REL";
const NOW = new Date().toISOString();

function loadEnvFile(fileName) {
  const filePath = resolve(process.cwd(), fileName);
  if (!existsSync(filePath)) return;

  const content = readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [rawKey, ...rawValue] = trimmed.split("=");
    const key = rawKey.trim();
    if (process.env[key]) continue;
    const value = rawValue
      .join("=")
      .trim()
      .replace(/^['"]|['"]$/g, "");
    process.env[key] = value;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const images = [
  "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1600607687644-c7171b42498b?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1616047006789-b7af5afb8c20?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=1200&q=80",
];

function addressJson(address) {
  return {
    source: "SEED_RELATED_PROPERTIES",
    formatted_address: `${address.logradouro}, ${address.numero} - ${address.bairro}, ${address.cidade} - ${address.estado}`,
    seed_key: address.key,
  };
}

function localizacaoContexto() {
  return {
    source: "SEED_RELATED_PROPERTIES",
    regiao: ["Residencial e familiar", "Tradicional e consolidada"],
    mobilidade: ["Acesso rapido a vias principais", "Transporte publico proximo"],
    comercio_servicos: ["Supermercados e conveniencias", "Escolas e educacao"],
    lazer: ["Parques e areas verdes", "Gastronomia e cafes"],
  };
}

const addresses = {
  living: {
    key: "living",
    place_id: `${SEED_PREFIX}-GEO-LIVING`,
    logradouro: "Rua Doutor Orlando Zamitti Mammana",
    numero: "80",
    bairro: "Santana",
    cidade: "Sao Paulo",
    estado: "SP",
    cep: "02039-010",
    lat: -23.5058,
    lng: -46.6238,
  },
  sameCep: {
    key: "same-cep",
    place_id: `${SEED_PREFIX}-GEO-SAME-CEP`,
    logradouro: "Rua Doutor Orlando Zamitti Mammana",
    numero: "120",
    bairro: "Santana",
    cidade: "Sao Paulo",
    estado: "SP",
    cep: "02039-010",
    lat: -23.5061,
    lng: -46.6242,
  },
  santana: {
    key: "santana",
    place_id: `${SEED_PREFIX}-GEO-SANTANA`,
    logradouro: "Rua Voluntarios da Patria",
    numero: "1880",
    bairro: "Santana",
    cidade: "Sao Paulo",
    estado: "SP",
    cep: "02010-300",
    lat: -23.5015,
    lng: -46.6259,
  },
  pinheiros: {
    key: "pinheiros",
    place_id: `${SEED_PREFIX}-GEO-PINHEIROS`,
    logradouro: "Rua dos Pinheiros",
    numero: "950",
    bairro: "Pinheiros",
    cidade: "Sao Paulo",
    estado: "SP",
    cep: "05422-001",
    lat: -23.5632,
    lng: -46.6829,
  },
  vilaMariana: {
    key: "vila-mariana",
    place_id: `${SEED_PREFIX}-GEO-VILA-MARIANA`,
    logradouro: "Rua Vergueiro",
    numero: "2500",
    bairro: "Vila Mariana",
    cidade: "Sao Paulo",
    estado: "SP",
    cep: "04102-001",
    lat: -23.5897,
    lng: -46.6344,
  },
};

async function assertOk(result, label) {
  if (result.error) {
    throw new Error(`${label}: ${result.error.message}`);
  }
  return result.data;
}

async function ensureProfile() {
  const profile = await assertOk(
    await supabase
      .from("profiles")
      .select("id,nickname,primeiro_nome,sobrenome,email")
      .eq("id", OWNER_ID)
      .maybeSingle(),
    "profile lookup",
  );

  if (!profile) {
    throw new Error(`Profile ${OWNER_ID} not found`);
  }

  return profile;
}

async function ensureGeolocacao(address) {
  const payload = {
    place_id: address.place_id,
    address_json: addressJson(address),
    logradouro: address.logradouro,
    numero: address.numero,
    bairro: address.bairro,
    cidade: address.cidade,
    uf: address.estado,
    cep: address.cep,
    lat: address.lat,
    lng: address.lng,
    endereco_formatado: `${address.logradouro}, ${address.numero} - ${address.bairro}, ${address.cidade} - ${address.estado}`,
    updated_at: NOW,
  };

  const row = await assertOk(
    await supabase
      .from("geolocacoes")
      .upsert(payload, { onConflict: "place_id" })
      .select("id")
      .single(),
    `geolocacao ${address.key}`,
  );

  return row.id;
}

async function ensureEmpreendimento(geolocacaoId) {
  const slug = "seed-living-nord-view-relacionados";
  const existing = await assertOk(
    await supabase
      .from("empreendimentos")
      .select("id")
      .eq("owner_id", OWNER_ID)
      .eq("slug_publico", slug)
      .maybeSingle(),
    "empreendimento lookup",
  );

  const payload = {
    owner_id: OWNER_ID,
    slug_publico: slug,
    nome: "Living Nord View Seed",
    descricao:
      "Empreendimento de teste para validar imóveis relacionados no mesmo condomínio e na mesma localização.",
    tipo_uso: "RESIDENCIAL",
    categoria_imovel: "APARTAMENTO",
    categoria_residencial: "APARTAMENTOS",
    tipologias_residenciais: ["APARTAMENTO_PADRAO"],
    categoria_comercial: null,
    tipologias_comerciais: [],
    logradouro: addresses.living.logradouro,
    numero: addresses.living.numero,
    bairro: addresses.living.bairro,
    cidade: addresses.living.cidade,
    estado: addresses.living.estado,
    cep: addresses.living.cep,
    lat: addresses.living.lat,
    lng: addresses.living.lng,
    geolocacao_id: geolocacaoId,
    address_json: addressJson(addresses.living),
    localizacao_contexto: localizacaoContexto(),
    fase: "ENTREGUE",
    status: "PUBLICADO",
    publicado_em: NOW,
    resumo_curto: "Seed para validar relações por empreendimento.",
    caracteristicas: ["PISCINA", "ACADEMIA", "SALAO_DE_FESTAS", "CHURRASQUEIRA"],
    n_torres: 1,
    n_andares: 22,
    n_unidades: 132,
    qtd_elevadores: 3,
    unidades_por_andar: 6,
    updated_at: NOW,
  };

  if (existing) {
    await assertOk(
      await supabase.from("empreendimentos").update(payload).eq("id", existing.id),
      "empreendimento update",
    );
    return existing.id;
  }

  const inserted = await assertOk(
    await supabase.from("empreendimentos").insert(payload).select("id").single(),
    "empreendimento insert",
  );
  return inserted.id;
}

function imovelPayload(seed, geolocacaoId, empreendimentoId) {
  const address = addresses[seed.addressKey];
  const price = seed.tipo_negociacao === "ALUGUEL" ? seed.preco_locacao : seed.preco_venda;

  return {
    owner_id: OWNER_ID,
    empreendimento_id: seed.empreendimento ? empreendimentoId : null,
    codigo: seed.codigo,
    slug_publico: seed.slug,
    titulo: seed.titulo,
    descricao: seed.descricao,
    descricao_curta: seed.descricao_curta,
    finalidade: seed.finalidade,
    tipo: seed.tipo,
    subtipo: seed.subtipo ?? null,
    status: seed.status,
    step_rascunho: 11,
    destaque: seed.destaque ?? false,
    preco_venda: seed.preco_venda ?? null,
    preco_locacao: seed.preco_locacao ?? null,
    valor_m2: price && seed.area_util ? Math.round(price / seed.area_util) : null,
    condominio: seed.condominio ?? null,
    iptu: seed.iptu ?? null,
    iptu_periodicidade: seed.iptu_periodicidade ?? "MENSAL",
    financiavel: seed.financiavel ?? true,
    tipo_negociacao: seed.tipo_negociacao,
    area_util: seed.area_util,
    area_total: seed.area_total ?? seed.area_util,
    dormitorios: seed.dormitorios,
    suites: seed.suites,
    banheiros: seed.banheiros,
    lavabos: seed.lavabos ?? 0,
    vagas: seed.vagas,
    salas: seed.salas ?? 1,
    cozinhas: seed.cozinhas ?? 1,
    vaga_tamanhos: seed.vagas ? ["MEDIA"] : null,
    vaga_coberturas: seed.vagas ? ["COBERTA"] : null,
    vaga_tipos: seed.vagas ? ["PRIVATIVA", "DEMARCADA"] : null,
    andar: seed.andar ?? null,
    mostrar_andar_no_anuncio: seed.mostrar_andar_no_anuncio ?? false,
    ano_construcao: seed.ano_construcao ?? 2021,
    geolocacao_id: geolocacaoId,
    logradouro: address.logradouro,
    numero: address.numero,
    bairro: address.bairro,
    cidade: address.cidade,
    estado: address.estado,
    cep: address.cep,
    lat: address.lat,
    lng: address.lng,
    address_json: addressJson(address),
    localizacao_contexto: localizacaoContexto(),
    enderecovisualizacao: "END_SEM_COMPLEMENTO",
    ocultar_numero_publico: false,
    mostrar_complemento_no_anuncio: false,
    usar_midias_empreendimento: true,
    usar_caracteristicas_empreendimento: true,
    caracteristicas: seed.caracteristicas,
    estado_conservacao: seed.estado_conservacao ?? "BOM",
    origem_cadastro: "MANUAL",
    permite_visita_imediata: true,
    publicado_em: seed.status === "PUBLICADO" ? NOW : null,
    indexar_google: false,
    meta_title: seed.titulo,
    meta_description: seed.descricao_curta,
    updated_at: NOW,
  };
}

const seeds = [
  {
    codigo: `${SEED_PREFIX}-BASE`,
    slug: "seed-rel-apartamento-base-santana",
    titulo: "Apartamento seed base em Santana",
    descricao:
      "<p>Imovel base para validar o motor de relacionados: venda, apartamento, Santana, Living Nord View Seed.</p>",
    descricao_curta: "Base para testar relacoes por empreendimento, CEP, bairro, cidade, area e preco.",
    finalidade: "COMPRAR",
    tipo_negociacao: "VENDA",
    tipo: "APARTAMENTO",
    status: "PUBLICADO",
    addressKey: "living",
    empreendimento: true,
    preco_venda: 1280000,
    condominio: 702,
    iptu: 1600,
    iptu_periodicidade: "ANUAL",
    area_util: 68,
    dormitorios: 2,
    suites: 1,
    banheiros: 2,
    vagas: 1,
    andar: 8,
    mostrar_andar_no_anuncio: true,
    destaque: true,
    caracteristicas: [
      "AMBIENTES_INTEGRADOS",
      "AR_CONDICIONADO",
      "ARMARIO_NA_COZINHA",
      "ARMARIO_NO_BANHEIRO",
      "BOX_BLINDEX",
      "VARANDA_GOURMET",
      "VENTILACAO_NATURAL",
    ],
  },
  {
    codigo: `${SEED_PREFIX}-EMP-01`,
    slug: "seed-rel-mesmo-empreendimento-01",
    titulo: "Apartamento no mesmo empreendimento",
    descricao: "<p>Mesmo empreendimento, tipologia e finalidade para validar a camada mais forte.</p>",
    descricao_curta: "Mesmo Living Nord View Seed, muito parecido com o imovel base.",
    finalidade: "COMPRAR",
    tipo_negociacao: "VENDA",
    tipo: "APARTAMENTO",
    status: "PUBLICADO",
    addressKey: "living",
    empreendimento: true,
    preco_venda: 1320000,
    condominio: 720,
    iptu: 1500,
    iptu_periodicidade: "ANUAL",
    area_util: 70,
    dormitorios: 2,
    suites: 1,
    banheiros: 2,
    vagas: 1,
    andar: 12,
    mostrar_andar_no_anuncio: true,
    caracteristicas: ["AMBIENTES_INTEGRADOS", "AR_CONDICIONADO", "VARANDA_GOURMET"],
  },
  {
    codigo: `${SEED_PREFIX}-EMP-02`,
    slug: "seed-rel-mesmo-empreendimento-02",
    titulo: "Apartamento maior no Living Nord View Seed",
    descricao: "<p>Mesmo empreendimento com area e preco um pouco acima para testar score intermediario.</p>",
    descricao_curta: "Mesmo empreendimento, metragem superior e preco dentro de uma faixa proxima.",
    finalidade: "COMPRAR",
    tipo_negociacao: "VENDA",
    tipo: "APARTAMENTO",
    status: "PUBLICADO",
    addressKey: "living",
    empreendimento: true,
    preco_venda: 1450000,
    condominio: 810,
    iptu: 1900,
    iptu_periodicidade: "ANUAL",
    area_util: 82,
    dormitorios: 3,
    suites: 1,
    banheiros: 3,
    vagas: 2,
    andar: 15,
    mostrar_andar_no_anuncio: true,
    caracteristicas: ["AMBIENTES_INTEGRADOS", "ARMARIO_EMBUTIDO_NO_QUARTO", "VARANDA"],
  },
  {
    codigo: `${SEED_PREFIX}-CEP-01`,
    slug: "seed-rel-mesmo-cep-santana",
    titulo: "Apartamento no mesmo CEP em Santana",
    descricao: "<p>Mesmo CEP, sem estar associado ao empreendimento do imovel base.</p>",
    descricao_curta: "Mesmo CEP e mesma tipologia para testar segunda camada de proximidade.",
    finalidade: "COMPRAR",
    tipo_negociacao: "VENDA",
    tipo: "APARTAMENTO",
    status: "PUBLICADO",
    addressKey: "sameCep",
    empreendimento: false,
    preco_venda: 1220000,
    condominio: 650,
    iptu: 1300,
    iptu_periodicidade: "ANUAL",
    area_util: 64,
    dormitorios: 2,
    suites: 1,
    banheiros: 2,
    vagas: 1,
    caracteristicas: ["AR_CONDICIONADO", "PISO_LAMINADO", "VARANDA"],
  },
  {
    codigo: `${SEED_PREFIX}-BAIRRO-01`,
    slug: "seed-rel-mesmo-bairro-santana",
    titulo: "Apartamento relacionado no bairro Santana",
    descricao: "<p>Mesmo bairro, outro CEP, para testar fallback de localizacao por bairro.</p>",
    descricao_curta: "Opcao no mesmo bairro, mas fora do CEP do imovel base.",
    finalidade: "COMPRAR",
    tipo_negociacao: "VENDA",
    tipo: "APARTAMENTO",
    status: "PUBLICADO",
    addressKey: "santana",
    empreendimento: false,
    preco_venda: 1360000,
    condominio: 760,
    iptu: 1450,
    iptu_periodicidade: "ANUAL",
    area_util: 72,
    dormitorios: 2,
    suites: 1,
    banheiros: 2,
    vagas: 1,
    caracteristicas: ["AMBIENTES_INTEGRADOS", "ESCRITORIO", "VENTILACAO_NATURAL"],
  },
  {
    codigo: `${SEED_PREFIX}-CIDADE-01`,
    slug: "seed-rel-mesma-cidade-pinheiros",
    titulo: "Apartamento relacionado em Pinheiros",
    descricao: "<p>Mesma cidade com score sustentado por preco, area e configuracao parecida.</p>",
    descricao_curta: "Opcao em outro bairro de Sao Paulo com perfil muito parecido.",
    finalidade: "COMPRAR",
    tipo_negociacao: "VENDA",
    tipo: "APARTAMENTO",
    status: "PUBLICADO",
    addressKey: "pinheiros",
    empreendimento: false,
    preco_venda: 1180000,
    condominio: 690,
    iptu: 1200,
    iptu_periodicidade: "ANUAL",
    area_util: 66,
    dormitorios: 2,
    suites: 1,
    banheiros: 2,
    vagas: 1,
    caracteristicas: ["PISO_DE_MADEIRA", "AR_CONDICIONADO", "VARANDA"],
  },
  {
    codigo: `${SEED_PREFIX}-CIDADE-02`,
    slug: "seed-rel-mesma-cidade-vila-mariana",
    titulo: "Apartamento relacionado na Vila Mariana",
    descricao: "<p>Mesmo municipio, com suite e vaga para validar score por atributos.</p>",
    descricao_curta: "Mesmo tipo e finalidade, em outro bairro de Sao Paulo.",
    finalidade: "COMPRAR",
    tipo_negociacao: "VENDA",
    tipo: "APARTAMENTO",
    status: "PUBLICADO",
    addressKey: "vilaMariana",
    empreendimento: false,
    preco_venda: 1390000,
    condominio: 740,
    iptu: 1550,
    iptu_periodicidade: "ANUAL",
    area_util: 74,
    dormitorios: 2,
    suites: 1,
    banheiros: 2,
    vagas: 1,
    caracteristicas: ["COZINHA_AMERICANA", "MOBILIADO", "VARANDA"],
  },
  {
    codigo: `${SEED_PREFIX}-WEAK-01`,
    slug: "seed-rel-controle-fraco-nao-priorizar",
    titulo: "Apartamento controle distante para score baixo",
    descricao: "<p>Controle publicado: mesmo tipo e cidade, mas com preco e area distantes.</p>",
    descricao_curta: "Deve ficar abaixo dos melhores resultados por diferenca de preco e area.",
    finalidade: "COMPRAR",
    tipo_negociacao: "VENDA",
    tipo: "APARTAMENTO",
    status: "PUBLICADO",
    addressKey: "pinheiros",
    empreendimento: false,
    preco_venda: 3200000,
    condominio: 2100,
    iptu: 5200,
    iptu_periodicidade: "ANUAL",
    area_util: 180,
    dormitorios: 4,
    suites: 3,
    banheiros: 5,
    vagas: 4,
    caracteristicas: ["PISCINA_PRIVATIVA", "ANDAR_INTEIRO", "VISTA_PANORAMICA"],
  },
  {
    codigo: `${SEED_PREFIX}-TYPE-CONTROL`,
    slug: "seed-rel-controle-casa-nao-entra",
    titulo: "Casa controle no mesmo bairro",
    descricao: "<p>Controle: mesmo bairro, mas outro tipo de imovel. Nao deve entrar para apartamento.</p>",
    descricao_curta: "Outro tipo para validar filtro duro por tipologia.",
    finalidade: "COMPRAR",
    tipo_negociacao: "VENDA",
    tipo: "CASA",
    status: "PUBLICADO",
    addressKey: "santana",
    empreendimento: false,
    preco_venda: 1300000,
    condominio: null,
    iptu: 1800,
    iptu_periodicidade: "ANUAL",
    area_util: 140,
    dormitorios: 3,
    suites: 1,
    banheiros: 3,
    vagas: 2,
    caracteristicas: ["QUINTAL", "CHURRASQUEIRA_NA_VARANDA", "AREA_DE_SERVICO"],
  },
  {
    codigo: `${SEED_PREFIX}-RENT-CONTROL`,
    slug: "seed-rel-controle-locacao-nao-entra-venda",
    titulo: "Apartamento controle para locacao",
    descricao: "<p>Controle: mesmo tipo e bairro, mas negociacao de aluguel. Nao deve entrar na venda.</p>",
    descricao_curta: "Controle para validar finalidade e tipo de negociacao.",
    finalidade: "ALUGAR",
    tipo_negociacao: "ALUGUEL",
    tipo: "APARTAMENTO",
    status: "PUBLICADO",
    addressKey: "santana",
    empreendimento: false,
    preco_locacao: 6200,
    condominio: 760,
    iptu: 380,
    iptu_periodicidade: "MENSAL",
    area_util: 70,
    dormitorios: 2,
    suites: 1,
    banheiros: 2,
    vagas: 1,
    caracteristicas: ["MOBILIADO", "AR_CONDICIONADO", "VARANDA"],
  },
  {
    codigo: `${SEED_PREFIX}-DRAFT-CONTROL`,
    slug: "seed-rel-controle-rascunho-nao-entra",
    titulo: "Apartamento rascunho controle",
    descricao: "<p>Controle: rascunho similar que nao deve aparecer no portal.</p>",
    descricao_curta: "Controle para validar filtro por status publicado.",
    finalidade: "COMPRAR",
    tipo_negociacao: "VENDA",
    tipo: "APARTAMENTO",
    status: "RASCUNHO",
    addressKey: "living",
    empreendimento: true,
    preco_venda: 1290000,
    condominio: 700,
    iptu: 1500,
    iptu_periodicidade: "ANUAL",
    area_util: 68,
    dormitorios: 2,
    suites: 1,
    banheiros: 2,
    vagas: 1,
    caracteristicas: ["AMBIENTES_INTEGRADOS", "AR_CONDICIONADO"],
  },
];

async function ensureImovel(seed, geolocacaoId, empreendimentoId) {
  const existing = await assertOk(
    await supabase
      .from("imoveis")
      .select("id")
      .eq("owner_id", OWNER_ID)
      .eq("codigo", seed.codigo)
      .maybeSingle(),
    `imovel lookup ${seed.codigo}`,
  );

  const payload = imovelPayload(seed, geolocacaoId, empreendimentoId);

  if (existing) {
    await assertOk(
      await supabase.from("imoveis").update(payload).eq("id", existing.id),
      `imovel update ${seed.codigo}`,
    );
    return existing.id;
  }

  const inserted = await assertOk(
    await supabase.from("imoveis").insert(payload).select("id").single(),
    `imovel insert ${seed.codigo}`,
  );
  return inserted.id;
}

async function ensureMediaForImovel(seed, imovelId, index) {
  if (seed.status !== "PUBLICADO") return;

  const imageUrl = images[index % images.length];
  const storagePath = `${OWNER_ID}/seed/related-properties/${seed.slug}/capa.jpg`;

  const existingMedia = await assertOk(
    await supabase
      .from("midia")
      .select("id")
      .eq("owner_id", OWNER_ID)
      .eq("storage_path", storagePath)
      .maybeSingle(),
    `midia lookup ${seed.codigo}`,
  );

  const mediaPayload = {
    owner_id: OWNER_ID,
    tipo: "IMAGEM",
    titulo: seed.titulo,
    alt: seed.titulo,
    largura: 1200,
    altura: 800,
    storage_bucket: "seed",
    storage_path: storagePath,
    storage_provider: "SUPABASE",
    url: imageUrl,
  };

  let mediaId = existingMedia?.id;
  if (mediaId) {
    await assertOk(
      await supabase.from("midia").update(mediaPayload).eq("id", mediaId),
      `midia update ${seed.codigo}`,
    );
  } else {
    const insertedMedia = await assertOk(
      await supabase.from("midia").insert(mediaPayload).select("id").single(),
      `midia insert ${seed.codigo}`,
    );
    mediaId = insertedMedia.id;
  }

  const existingRelation = await assertOk(
    await supabase
      .from("midia_relacoes")
      .select("id")
      .eq("owner_id", OWNER_ID)
      .eq("ref_tipo", "IMOVEL")
      .eq("ref_id", imovelId)
      .eq("midia_id", mediaId)
      .maybeSingle(),
    `midia relation lookup ${seed.codigo}`,
  );

  let relationId = existingRelation?.id;
  const relationPayload = {
    owner_id: OWNER_ID,
    midia_id: mediaId,
    ref_tipo: "IMOVEL",
    ref_id: imovelId,
    grupo: "GALERIA",
    ordem: 0,
  };

  if (relationId) {
    await assertOk(
      await supabase.from("midia_relacoes").update(relationPayload).eq("id", relationId),
      `midia relation update ${seed.codigo}`,
    );
  } else {
    const insertedRelation = await assertOk(
      await supabase.from("midia_relacoes").insert(relationPayload).select("id").single(),
      `midia relation insert ${seed.codigo}`,
    );
    relationId = insertedRelation.id;
  }

  const existingPublicMedia = await assertOk(
    await supabase
      .from("imovel_midia_publica")
      .select("id")
      .eq("owner_id", OWNER_ID)
      .eq("imovel_id", imovelId)
      .eq("indice_publico", 1)
      .maybeSingle(),
    `public media lookup ${seed.codigo}`,
  );

  const publicPayload = {
    owner_id: OWNER_ID,
    imovel_id: imovelId,
    midia_id: mediaId,
    midia_relacao_id: relationId,
    slug_publico: seed.slug,
    indice_publico: 1,
    ordem: 0,
    storage_bucket: "seed",
    storage_path: storagePath,
    storage_provider: "SUPABASE",
    url: imageUrl,
    updated_at: NOW,
  };

  if (existingPublicMedia) {
    await assertOk(
      await supabase.from("imovel_midia_publica").update(publicPayload).eq("id", existingPublicMedia.id),
      `public media update ${seed.codigo}`,
    );
    return;
  }

  await assertOk(
    await supabase.from("imovel_midia_publica").insert(publicPayload),
    `public media insert ${seed.codigo}`,
  );
}

async function main() {
  const profile = await ensureProfile();
  const geolocacoes = {};

  for (const [key, address] of Object.entries(addresses)) {
    geolocacoes[key] = await ensureGeolocacao(address);
  }

  const empreendimentoId = await ensureEmpreendimento(geolocacoes.living);
  const imovelIds = [];

  for (const [index, seed] of seeds.entries()) {
    const imovelId = await ensureImovel(seed, geolocacoes[seed.addressKey], empreendimentoId);
    await ensureMediaForImovel(seed, imovelId, index);
    imovelIds.push({ codigo: seed.codigo, slug: seed.slug, status: seed.status, id: imovelId });
  }

  const publishedCount = imovelIds.filter((item) => item.status === "PUBLICADO").length;
  const baseUrl = profile.nickname
    ? `/${profile.nickname}/venda/seed-rel-apartamento-base-santana`
    : "/[nickname]/venda/seed-rel-apartamento-base-santana";

  console.log(
    JSON.stringify(
      {
        owner_id: OWNER_ID,
        nickname: profile.nickname,
        empreendimento_id: empreendimentoId,
        imoveis_total: imovelIds.length,
        imoveis_publicados: publishedCount,
        base_url: baseUrl,
        codigos: imovelIds.map((item) => item.codigo),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
