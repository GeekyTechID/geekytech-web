export type StoreOrigin = {
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  subdistrict: string;
  postal_code: string;
  address: string;
  /** Origin latitude — required for on-demand couriers (GoSend, Grab, etc.) */
  lat?: string;
  /** Origin longitude — required for on-demand couriers (GoSend, Grab, etc.) */
  lng?: string;
};

export const DEFAULT_STORE_ORIGIN: StoreOrigin = {
  name: "",
  phone: "",
  province: "",
  city: "",
  district: "",
  subdistrict: "",
  postal_code: "",
  address: "",
  lat: "",
  lng: "",
};

export function parseStoreOrigin(raw: unknown): StoreOrigin {
  const partial = (raw ?? {}) as Partial<StoreOrigin>;
  return {
    ...DEFAULT_STORE_ORIGIN,
    ...partial,
    subdistrict: partial.subdistrict ?? "",
    lat: partial.lat ?? "",
    lng: partial.lng ?? "",
  };
}
