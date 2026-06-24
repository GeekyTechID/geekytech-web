export type MidtransRefundResult =
  | { ok: true }
  | { ok: false; error: string };

export async function refundMidtransTransaction(
  midtransOrderId: string,
  reason: string,
  amount: number,
): Promise<MidtransRefundResult> {
  const serverKey = process.env.MIDTRANS_SERVER_KEY?.trim();
  if (!serverKey) return { ok: false, error: "MIDTRANS_SERVER_KEY tidak dikonfigurasi." };

  const isProduction = process.env.MIDTRANS_IS_PRODUCTION === "true";
  const base = isProduction
    ? "https://api.midtrans.com"
    : "https://api.sandbox.midtrans.com";

  const base64Key = Buffer.from(`${serverKey}:`).toString("base64");

  try {
    const res = await fetch(`${base}/v2/${encodeURIComponent(midtransOrderId)}/refund`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${base64Key}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reason, amount, refund_key: midtransOrderId }),
    });

    const json = (await res.json()) as Record<string, unknown>;

    if (!res.ok || (json.status_code && json.status_code !== "200")) {
      const errMsg =
        (json.status_message as string) ??
        (json.error_messages as string) ??
        `Midtrans refund error ${res.status}`;
      console.error("[Midtrans refundTransaction] failed", {
        midtransOrderId,
        status: res.status,
        error: errMsg,
      });
      return { ok: false, error: errMsg };
    }

    return { ok: true };
  } catch (err) {
    console.error("[Midtrans refundTransaction] network error", { midtransOrderId, err });
    return { ok: false, error: "Jaringan ke Midtrans gagal." };
  }
}
