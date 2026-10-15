export type BiteshipBrand = {
  code: string;
  name: string;
  logo?: string;
  /** true = on-demand (delivery_type: "now"); false/absent = standard (delivery_type: "later") */
  onDemand?: boolean;
  /**
   * Cara paket diserahkan ke kurir (origin_collection_method Biteship).
   * Default "pickup" (kurir jemput di toko); "drop_off" = admin antar ke counter kurir.
   * Hanya boleh nilai yang ada di available_collection_method (GET /v1/couriers).
   */
  collection?: CollectionMethod;
};

export type CollectionMethod = "pickup" | "drop_off";

// Standard couriers — delivery_type: "later" (pickup scheduled by courier)
const STANDARD: BiteshipBrand[] = [
  { code: "jne",          name: "JNE",           logo: "/couriers/jne.png" },
  { code: "sicepat",      name: "SiCepat",       logo: "/couriers/sicepat.png" },
  { code: "jnt",          name: "J&T Express",   logo: "/couriers/j&t.png" },
  { code: "anteraja",     name: "AnterAja",      logo: "/couriers/antaraja.png" },
  // TIKI mendukung pickup & drop_off — GeekyTech antar sendiri ke counter.
  { code: "tiki",         name: "TIKI",          logo: "/couriers/tiki.png",     collection: "drop_off" },
  { code: "ninja",        name: "Ninja Xpress",  logo: "/couriers/ninjaexpress.png" },
  { code: "lion",         name: "Lion Parcel",   logo: "/couriers/lionparcel.png" },
  // Wahana (Deno) hanya menerima drop_off.
  { code: "wahana",       name: "Wahana",        logo: "/couriers/wahana.png",   collection: "drop_off" },
  { code: "sap",          name: "SAP Express",   logo: "/couriers/sap.png" },
  { code: "pos",          name: "Pos Indonesia", logo: "/couriers/posindonesia.png" },
  { code: "idexpress",    name: "ID Express",    logo: "/couriers/idexpress.png" },
  { code: "paxel",        name: "Paxel",         logo: "/couriers/paxel.png" },
  { code: "rpx",          name: "RPX",           logo: "/couriers/rpx.png" },
  { code: "sentralcargo", name: "Sentral Cargo", logo: "/couriers/sentralcargo.png" },
  { code: "dash_express", name: "Dash Express",  logo: "/couriers/dash.png" },
];

// On-demand couriers — delivery_type: "now" (kurir jemput sekarang, butuh koordinat)
const ON_DEMAND: BiteshipBrand[] = [
  { code: "gojek",     name: "Gojek",     logo: "/couriers/gojek.png",     onDemand: true },
  { code: "grab",      name: "Grab",      logo: "/couriers/grab.png",      onDemand: true },
  { code: "borzo",     name: "Borzo",     logo: "/couriers/borzo.png",     onDemand: true },
  { code: "lalamove",  name: "Lalamove",  logo: "/couriers/lalamove.png",  onDemand: true },
  { code: "deliveree", name: "Deliveree", logo: "/couriers/deliveree.png", onDemand: true },
];

export const BITESHIP_COURIER_BRANDS: BiteshipBrand[] = [...STANDARD, ...ON_DEMAND];

/** Metode serah terima paket untuk kurir (default pickup). */
export function courierCollectionMethod(courierCode: string | null | undefined): CollectionMethod {
  const code = (courierCode ?? "").toLowerCase();
  return BITESHIP_COURIER_BRANDS.find((b) => b.code === code)?.collection ?? "pickup";
}
