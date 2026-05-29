const TYPE_LABELS: Record<string, string> = {
  order_placed: "Pesanan",
  payment_confirmed: "Pembayaran",
  payment_pending: "Pembayaran",
  payment_failed: "Pembayaran",
  payment_issue: "Pembayaran",
  order_shipped: "Pengiriman",
  order_in_transit: "Pengiriman",
  order_delivered: "Pengiriman",
  chat_message: "Chat",
  chat_message_user: "Chat",
  chat_session_closed: "Chat",
  welcome: "Akun",
};

export function getNotificationTypeLabel(type: string): string {
  if (TYPE_LABELS[type]) return TYPE_LABELS[type];
  if (type.startsWith("payment_")) return "Pembayaran";
  if (type.startsWith("order_")) return "Pesanan";
  return "Info";
}

type NotifDisplayInput = {
  type: string;
  title: string;
  body: string;
};

export function formatNotificationBody(notif: NotifDisplayInput): string {
  const body = notif.body.trim();
  if (!body) return "";

  if (notif.type === "chat_message" || notif.type === "chat_message_user") {
    if (body === "[file]") return "Admin mengirim lampiran.";
    return body.length > 120 ? `${body.slice(0, 117)}…` : body;
  }

  if (body === notif.title.trim()) return "";

  return body.length > 140 ? `${body.slice(0, 137)}…` : body;
}
