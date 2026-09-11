import type {
  CreativeFormat,
  CreativeTemplateConfig,
  PropertyCreativePayload,
} from "@/lib/creatives/static-template";

const PROPERTY_IMAGE =
  "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1800&q=88";
export const DEFAULT_POOL_IMAGE =
  "https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=1800&q=88";
const CAROUSEL_IMAGES = [
  PROPERTY_IMAGE,
  DEFAULT_POOL_IMAGE,
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1800&q=88",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1800&q=88",
];

export function templatePreviewPayload(
  format: CreativeFormat,
  config: CreativeTemplateConfig,
  rendererKey: string,
): PropertyCreativePayload {
  return {
    property: {
      id: "template-preview",
      title:
        "Apartamento à venda, 180m², 4 Dormitórios, 3 Suítes, Pinheiros - São Paulo/SP",
      location: "Living Nord View",
      price: "R$ 3.200.000",
      code: "ONE-1001-0001",
      imageUrl: PROPERTY_IMAGE,
      secondaryImageUrl:
        rendererKey === "property-dual-02" ? DEFAULT_POOL_IMAGE : undefined,
      carouselImages:
        rendererKey === "property-journey-carousel-01"
          ? CAROUSEL_IMAGES
          : undefined,
      features: [
        "Varanda integrada",
        "Lazer completo",
        "Iluminação natural",
        "Planta inteligente",
      ],
      highlight: "Exclusividade",
      stats: [
        { kind: "AREA", value: "180", label: "m² úteis" },
        { kind: "BED", value: "4", label: "Dormitórios" },
        { kind: "SUITE", value: "3", label: "Suítes" },
        { kind: "CAR", value: "4", label: "Vagas" },
      ],
    },
    broker: {
      name: "Marina Oliveira",
      nickname: "marinaoliveira",
      creci: "SP 123456-F",
      avatarUrl: null,
      logoUrl: null,
      logoWhiteUrl: null,
    },
    copy: {
      headline: "",
      supportingText: "",
      cta: "Conheça os detalhes",
      titleMode: "FULL",
    },
    format,
    colorTheme:
      rendererKey === "property-editorial-03" ||
      rendererKey === "property-journey-carousel-01"
        ? "PETROL"
        : undefined,
    templateConfig: config,
  };
}
