export type CheckoutShippingOption = {
  courierCode: string;
  serviceCode: string;
  courierName: string;
  serviceName: string;
  price: number;
  etd: string;
};

/** Fallback ongkir bila Biteship tidak dikonfigurasi / error. */
export const MOCK_CHECKOUT_SHIPPING: CheckoutShippingOption[] = [
  {
    courierCode: "jne",
    serviceCode: "reg",
    courierName: "JNE",
    serviceName: "Reguler (REG)",
    price: 8500,
    etd: "3–5 hari kerja",
  },
  {
    courierCode: "jne",
    serviceCode: "yes",
    courierName: "JNE",
    serviceName: "YES",
    price: 18000,
    etd: "1–2 hari kerja",
  },
  {
    courierCode: "sicepat",
    serviceCode: "reg",
    courierName: "SiCepat",
    serviceName: "Reguler",
    price: 7500,
    etd: "2–4 hari kerja",
  },
  {
    courierCode: "anteraja",
    serviceCode: "reg",
    courierName: "AnterAja",
    serviceName: "Reguler",
    price: 9000,
    etd: "2–4 hari kerja",
  },
];

export function findMockShippingOption(
  courierCode: string,
  serviceCode: string,
): CheckoutShippingOption | null {
  const c = courierCode.toLowerCase();
  const s = serviceCode.toLowerCase();
  return MOCK_CHECKOUT_SHIPPING.find((o) => o.courierCode === c && o.serviceCode === s) ?? null;
}
