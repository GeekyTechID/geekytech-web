type BiteshipOrderItem = {
  name: string;
  value: number;
  quantity: number;
  weight: number;
};

export type CreateBiteshipOrderParams = {
  destinationName: string;
  destinationPhone: string;
  destinationAddress: string;
  destinationPostalCode: number;
  courierCompany: string;
  courierType: string;
  items: BiteshipOrderItem[];
  orderNote?: string;
};

export type CreateBiteshipOrderResult =
  | {
      ok: true;
      biteshipOrderId: string;
      awb: string | null;
      trackingId: string | null;
      status: string;
      courierName: string | null;
    }
  | { ok: false; error: string };

export async function createBiteshipOrder(
  params: CreateBiteshipOrderParams,
): Promise<CreateBiteshipOrderResult> {
  const key = process.env.BITESHIP_API_KEY?.trim();
  const shipperName = process.env.BITESHIP_SHIPPER_NAME?.trim();
  const shipperPhone = process.env.BITESHIP_SHIPPER_PHONE?.trim();
  const originAddress = process.env.BITESHIP_ORIGIN_ADDRESS?.trim();
  const originPostalRaw = (process.env.BITESHIP_ORIGIN_POSTAL_CODE ?? process.env.BITESHIP_ORIGIN_POSTAL)?.trim();

  if (!key || !shipperName || !shipperPhone || !originAddress || !originPostalRaw) {
    return { ok: false, error: "Biteship origin belum dikonfigurasi." };
  }

  const originPostal = parseInt(originPostalRaw, 10);
  if (!Number.isFinite(originPostal)) {
    return { ok: false, error: "BITESHIP_ORIGIN_POSTAL tidak valid." };
  }

  const isProd = process.env.BITESHIP_IS_PRODUCTION === "true";
  const base = isProd ? "https://api.biteship.com" : "https://api.sandbox.biteship.com";

  const body = {
    shipper_contact_name: shipperName,
    shipper_contact_phone: shipperPhone,
    shipper_organization: "GeekyTech",
    origin_contact_name: shipperName,
    origin_contact_phone: shipperPhone,
    origin_address: originAddress,
    origin_postal_code: originPostal,
    destination_contact_name: params.destinationName,
    destination_contact_phone: params.destinationPhone,
    destination_address: params.destinationAddress,
    destination_postal_code: params.destinationPostalCode,
    courier_company: params.courierCompany.toLowerCase(),
    courier_type: params.courierType,
    delivery_type: "now",
    order_note: params.orderNote ?? null,
    items: params.items.map((i) => ({
      name: i.name.slice(0, 100),
      description: i.name.slice(0, 255),
      value: Math.max(1000, Math.round(i.value)),
      quantity: i.quantity,
      weight: Math.max(1, Math.round(i.weight)),
      length: 10,
      width: 10,
      height: 10,
    })),
  };

  try {
    const res = await fetch(`${base}/v1/orders`, {
      method: "POST",
      headers: {
        Authorization: key.startsWith("Bearer ") ? key : `Bearer ${key}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const json = (await res.json()) as Record<string, unknown>;

    if (!res.ok || json.success === false) {
      const errMsg =
        (json.error as string) ??
        (json.message as string) ??
        `Biteship error ${res.status}`;
      return { ok: false, error: errMsg };
    }

    const courier = json.courier as Record<string, unknown> | undefined;

    return {
      ok: true,
      biteshipOrderId: json.id as string,
      awb: (courier?.waybill_id as string | null) ?? null,
      trackingId: (courier?.tracking_id as string | null) ?? null,
      status: (json.status as string) ?? "pending",
      courierName: (courier?.name as string | null) ?? null,
    };
  } catch {
    return { ok: false, error: "Jaringan ke Biteship gagal." };
  }
}
