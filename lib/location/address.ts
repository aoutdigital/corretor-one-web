import type { AddressCore } from "@/lib/location/types";

function normalizeSpaces(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function formatAddressFromFields(address: AddressCore) {
  const logradouro = normalizeSpaces(address.logradouro);
  const numero = normalizeSpaces(address.numero);
  const bairro = normalizeSpaces(address.bairro);
  const cidade = normalizeSpaces(address.cidade);
  const estado = normalizeSpaces(address.estado).toUpperCase();

  if (!logradouro || !bairro || !cidade || !estado) return "";
  if (numero) return `${logradouro}, ${numero} - ${bairro}, ${cidade} - ${estado}, Brasil`;
  return `${logradouro} - ${bairro}, ${cidade} - ${estado}, Brasil`;
}

export function replaceOrAppendAddressNumber(baseSearch: string, nextNumero: string) {
  const base = normalizeSpaces(baseSearch);
  if (!base) return "";

  const number = normalizeSpaces(nextNumero);
  const withoutCountry = base.replace(/,\s*Brasil$/i, "").trim();
  const [headRaw, ...tailParts] = withoutCountry.split(" - ");
  const head = normalizeSpaces(headRaw || "");
  const tail = tailParts.length ? ` - ${tailParts.join(" - ").trim()}` : "";

  const headWithoutNumber = head.replace(/,\s*[^,]+$/u, "").trim();
  const nextHead = number ? `${headWithoutNumber || head}, ${number}` : headWithoutNumber || head;

  return `${nextHead}${tail}, Brasil`.replace(/\s+,/g, ",");
}
