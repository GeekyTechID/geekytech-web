export type StoreOrigin = {
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  subdistrict: string;
  postal_code: string;
  address: string;
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
};

export function parseStoreOrigin(raw: unknown): StoreOrigin {
  const partial = (raw ?? {}) as Partial<StoreOrigin>;
  return {
    ...DEFAULT_STORE_ORIGIN,
    ...partial,
    subdistrict: partial.subdistrict ?? "",
  };
}
