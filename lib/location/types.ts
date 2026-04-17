export type PlacePrediction = {
  place_id: string;
  description: string;
};

export type PlaceDetails = {
  place_id: string;
  name: string;
  formatted_address: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  lat: number | null;
  lng: number | null;
  address_components: unknown[];
};

export type AddressCore = {
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
};
