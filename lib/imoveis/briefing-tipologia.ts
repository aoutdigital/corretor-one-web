export type BriefingTipoUso = "RESIDENCIAL" | "COMERCIAL";

export type BriefingCategoriaOption = {
  value: string;
  label: string;
};

export type BriefingSubcategoriaOption = {
  value: string;
  label: string;
  tipo_imovel: string;
};

const CATEGORIA_OPTIONS_BY_USO: Record<BriefingTipoUso, BriefingCategoriaOption[]> = {
  RESIDENCIAL: [
    { value: "APARTAMENTO", label: "Apartamento" },
    { value: "CASA", label: "Casa" },
    { value: "LOTE_TERRENO", label: "Terreno" },
    { value: "FAZENDA_SITIO_CHACARA", label: "Fazenda / Sítio / Chácara" },
    { value: "GARAGEM", label: "Garagem" },
  ],
  COMERCIAL: [
    { value: "ESCRITORIO", label: "Escritório" },
    { value: "CASA_COMERCIAL", label: "Casa comercial" },
    { value: "PONTO_COMERCIAL_LOJA_BOX", label: "Loja / Box" },
    { value: "GALPAO_DEPOSITO_ARMAZEM", label: "Galpão / Armazém" },
    { value: "PREDIO_EDIFICIO_INTEIRO", label: "Prédio / Edifício inteiro" },
    { value: "LOTE_TERRENO", label: "Terreno" },
    { value: "SHOPPING", label: "Shopping" },
    { value: "SELF_STORAGE", label: "Self storage" },
    { value: "HOTEL_MOTEL_POUSADA", label: "Hotel / Motel / Pousada" },
  ],
};

const SUBCATEGORIA_LABELS = {
  PADRAO: "Padrão",
  GARDEN: "Garden",
  DUPLEX: "Duplex",
  TRIPLEX: "Triplex",
  COBERTURA_PADRAO: "Cobertura padrão",
  COBERTURA_DUPLEX: "Cobertura duplex",
  COBERTURA_TRIPLEX: "Cobertura triplex",
  FLAT: "Flat",
  LOFT: "Loft",
  KITNET_CONJUGADO: "Kitnet / Conjugado",
  STUDIO: "Studio",
  SOBRADO: "Sobrado",
  GEMINADA: "Geminada",
  CASA_DE_CONDOMINIO: "Casa de condomínio",
  CASA_DE_VILA: "Casa de vila",
  CONJUNTO_COMERCIAL: "Conjunto comercial",
  ANDAR_INTEIRO: "Andar inteiro",
  MEIO_ANDAR: "Meio andar",
  LOJA_BOX: "Loja / Box",
  GALPAO: "Galpão",
  SELF_STORAGE: "Self storage",
  LOTE_TERRENO: "Lote / Terreno",
  TERREO: "Térreo",
} as const;

const SUBCATEGORIA_OPTIONS_BY_USO_E_CATEGORIA: Record<
  BriefingTipoUso,
  Record<string, BriefingSubcategoriaOption[]>
> = {
  RESIDENCIAL: {
    APARTAMENTO: [
      { value: "PADRAO", label: SUBCATEGORIA_LABELS.PADRAO, tipo_imovel: "APARTAMENTO" },
      { value: "GARDEN", label: SUBCATEGORIA_LABELS.GARDEN, tipo_imovel: "APARTAMENTO" },
      { value: "DUPLEX", label: SUBCATEGORIA_LABELS.DUPLEX, tipo_imovel: "APARTAMENTO" },
      { value: "TRIPLEX", label: SUBCATEGORIA_LABELS.TRIPLEX, tipo_imovel: "APARTAMENTO" },
      { value: "COBERTURA_PADRAO", label: SUBCATEGORIA_LABELS.COBERTURA_PADRAO, tipo_imovel: "COBERTURA" },
      { value: "COBERTURA_DUPLEX", label: SUBCATEGORIA_LABELS.COBERTURA_DUPLEX, tipo_imovel: "COBERTURA" },
      { value: "COBERTURA_TRIPLEX", label: SUBCATEGORIA_LABELS.COBERTURA_TRIPLEX, tipo_imovel: "COBERTURA" },
      { value: "FLAT", label: SUBCATEGORIA_LABELS.FLAT, tipo_imovel: "FLAT" },
      { value: "LOFT", label: SUBCATEGORIA_LABELS.LOFT, tipo_imovel: "LOFT" },
      { value: "KITNET_CONJUGADO", label: SUBCATEGORIA_LABELS.KITNET_CONJUGADO, tipo_imovel: "KITNET_CONJUGADO" },
      { value: "STUDIO", label: SUBCATEGORIA_LABELS.STUDIO, tipo_imovel: "STUDIO" },
    ],
    CASA: [
      { value: "PADRAO", label: SUBCATEGORIA_LABELS.PADRAO, tipo_imovel: "CASA" },
      { value: "SOBRADO", label: SUBCATEGORIA_LABELS.SOBRADO, tipo_imovel: "CASA" },
      { value: "GEMINADA", label: SUBCATEGORIA_LABELS.GEMINADA, tipo_imovel: "CASA" },
      { value: "CASA_DE_CONDOMINIO", label: SUBCATEGORIA_LABELS.CASA_DE_CONDOMINIO, tipo_imovel: "CASA_DE_CONDOMINIO" },
      { value: "CASA_DE_VILA", label: SUBCATEGORIA_LABELS.CASA_DE_VILA, tipo_imovel: "CASA_DE_VILA" },
    ],
    LOTE_TERRENO: [{ value: "LOTE_TERRENO", label: SUBCATEGORIA_LABELS.LOTE_TERRENO, tipo_imovel: "LOTE_TERRENO" }],
    FAZENDA_SITIO_CHACARA: [{ value: "PADRAO", label: SUBCATEGORIA_LABELS.PADRAO, tipo_imovel: "FAZENDA_SITIO_CHACARA" }],
    GARAGEM: [{ value: "PADRAO", label: SUBCATEGORIA_LABELS.PADRAO, tipo_imovel: "GARAGEM" }],
  },
  COMERCIAL: {
    ESCRITORIO: [
      { value: "PADRAO", label: SUBCATEGORIA_LABELS.PADRAO, tipo_imovel: "ESCRITORIO" },
      { value: "CONJUNTO_COMERCIAL", label: SUBCATEGORIA_LABELS.CONJUNTO_COMERCIAL, tipo_imovel: "ESCRITORIO" },
      { value: "ANDAR_INTEIRO", label: SUBCATEGORIA_LABELS.ANDAR_INTEIRO, tipo_imovel: "ESCRITORIO" },
      { value: "MEIO_ANDAR", label: SUBCATEGORIA_LABELS.MEIO_ANDAR, tipo_imovel: "ESCRITORIO" },
    ],
    CASA_COMERCIAL: [
      { value: "PADRAO", label: SUBCATEGORIA_LABELS.PADRAO, tipo_imovel: "CASA_COMERCIAL" },
      { value: "SOBRADO", label: SUBCATEGORIA_LABELS.SOBRADO, tipo_imovel: "CASA_COMERCIAL" },
      { value: "TERREO", label: SUBCATEGORIA_LABELS.TERREO, tipo_imovel: "CASA_COMERCIAL" },
    ],
    PONTO_COMERCIAL_LOJA_BOX: [
      { value: "LOJA_BOX", label: SUBCATEGORIA_LABELS.LOJA_BOX, tipo_imovel: "PONTO_COMERCIAL_LOJA_BOX" },
      { value: "TERREO", label: SUBCATEGORIA_LABELS.TERREO, tipo_imovel: "PONTO_COMERCIAL_LOJA_BOX" },
    ],
    GALPAO_DEPOSITO_ARMAZEM: [{ value: "GALPAO", label: SUBCATEGORIA_LABELS.GALPAO, tipo_imovel: "GALPAO_DEPOSITO_ARMAZEM" }],
    PREDIO_EDIFICIO_INTEIRO: [
      { value: "PADRAO", label: SUBCATEGORIA_LABELS.PADRAO, tipo_imovel: "PREDIO_EDIFICIO_INTEIRO" },
      { value: "ANDAR_INTEIRO", label: SUBCATEGORIA_LABELS.ANDAR_INTEIRO, tipo_imovel: "PREDIO_EDIFICIO_INTEIRO" },
      { value: "MEIO_ANDAR", label: SUBCATEGORIA_LABELS.MEIO_ANDAR, tipo_imovel: "PREDIO_EDIFICIO_INTEIRO" },
    ],
    LOTE_TERRENO: [{ value: "LOTE_TERRENO", label: SUBCATEGORIA_LABELS.LOTE_TERRENO, tipo_imovel: "LOTE_TERRENO" }],
    SHOPPING: [{ value: "LOJA_BOX", label: SUBCATEGORIA_LABELS.LOJA_BOX, tipo_imovel: "SHOPPING" }],
    SELF_STORAGE: [{ value: "SELF_STORAGE", label: SUBCATEGORIA_LABELS.SELF_STORAGE, tipo_imovel: "SELF_STORAGE" }],
    HOTEL_MOTEL_POUSADA: [{ value: "PADRAO", label: SUBCATEGORIA_LABELS.PADRAO, tipo_imovel: "HOTEL_MOTEL_POUSADA" }],
  },
};

export function isBriefingTipoUso(value: string | null | undefined): value is BriefingTipoUso {
  return value === "RESIDENCIAL" || value === "COMERCIAL";
}

export function getBriefingCategoriaOptions(uso: string | null | undefined): BriefingCategoriaOption[] {
  if (!isBriefingTipoUso(uso)) return [];
  return [...CATEGORIA_OPTIONS_BY_USO[uso]];
}

export function getBriefingCategoriaLabel(uso: string | null | undefined, categoria: string | null | undefined) {
  if (!categoria) return null;
  return getBriefingCategoriaOptions(uso).find((item) => item.value === categoria)?.label ?? null;
}

export function getBriefingSubcategoriaOptions(
  uso: string | null | undefined,
  categoria: string | null | undefined,
): BriefingSubcategoriaOption[] {
  if (!isBriefingTipoUso(uso) || !categoria) return [];
  return [...(SUBCATEGORIA_OPTIONS_BY_USO_E_CATEGORIA[uso][categoria] ?? [])];
}

export function inferBriefingCategoriaToken(params: {
  uso: string | null | undefined;
  tipoImovel: string | null | undefined;
}) {
  if (!isBriefingTipoUso(params.uso) || !params.tipoImovel) return null;
  const categorias = getBriefingCategoriaOptions(params.uso);
  return (
    categorias.find((categoria) =>
      getBriefingSubcategoriaOptions(params.uso, categoria.value).some((item) => item.tipo_imovel === params.tipoImovel),
    )?.value ?? null
  );
}

export function resolveBriefingTipologiaSelection(params: {
  uso: string | null | undefined;
  categoria: string;
  subcategoria: string;
}) {
  const categoria = getBriefingCategoriaOptions(params.uso).find((item) => item.value === params.categoria);
  if (!categoria) return null;
  const subcategoria = getBriefingSubcategoriaOptions(params.uso, params.categoria).find(
    (item) => item.value === params.subcategoria,
  );
  if (!subcategoria) return null;
  return {
    categoriaToken: categoria.value,
    categoriaLabel: categoria.label,
    subcategoriaToken: subcategoria.value,
    subcategoriaLabel: subcategoria.label,
    tipoImovel: subcategoria.tipo_imovel,
  };
}

export function inferBriefingSubcategoriaToken(params: {
  uso: string | null | undefined;
  categoria: string | null | undefined;
  tipoImovel: string | null | undefined;
}) {
  const options = getBriefingSubcategoriaOptions(params.uso, params.categoria);
  if (!options.length) return null;
  if (!params.tipoImovel) return options[0]?.value ?? null;
  return options.find((item) => item.tipo_imovel === params.tipoImovel)?.value ?? options[0]?.value ?? null;
}

export function describeBriefingTipologiaSelection(params: {
  uso: string | null | undefined;
  categoria: string | null | undefined;
  subcategoria: string | null | undefined;
  tipoImovel: string | null | undefined;
}) {
  const categoriaLabel = getBriefingCategoriaLabel(params.uso, params.categoria) ?? params.categoria ?? "Categoria";
  const subcategoriaOption = getBriefingSubcategoriaOptions(params.uso, params.categoria).find(
    (item) => item.value === params.subcategoria,
  );
  if (subcategoriaOption) {
    return {
      categoriaLabel,
      subcategoriaLabel: subcategoriaOption.label,
      tipoImovel: subcategoriaOption.tipo_imovel,
      displayLabel: `${categoriaLabel} > ${subcategoriaOption.label}`,
    };
  }

  return {
    categoriaLabel,
    subcategoriaLabel: params.tipoImovel ?? "Tipologia",
    tipoImovel: params.tipoImovel ?? "",
    displayLabel: params.tipoImovel ? `${categoriaLabel} > ${params.tipoImovel}` : categoriaLabel,
  };
}
