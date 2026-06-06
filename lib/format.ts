/**
 * Format angka ke format Rupiah.
 * Contoh: 1500000 → "Rp 1.500.000"
 */
export function formatRupiah(
  amount: number,
  compact = false,
): string {
  if (compact) {
    if (amount >= 1_000_000_000) {
      return `Rp ${(amount / 1_000_000_000).toFixed(1)}M`;
    }
    if (amount >= 1_000_000) {
      return `Rp ${(amount / 1_000_000).toFixed(1)}jt`;
    }
    if (amount >= 1_000) {
      return `Rp ${(amount / 1_000).toFixed(0)}rb`;
    }
  }
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format tanggal ke format lokal Indonesia.
 * Contoh: "30 Apr 2026, 22:05"
 */
export function formatDate(
  dateStr: string,
  options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
  },
): string {
  return new Intl.DateTimeFormat("id-ID", { ...options, timeZone: "Asia/Jakarta" }).format(new Date(dateStr));
}

/**
 * Format tanggal relatif.
 * Contoh: "2 jam lalu", "3 hari lalu"
 */
export function formatRelativeDate(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return "Baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;
  if (hours < 24) return `${hours} jam lalu`;
  if (days < 30) return `${days} hari lalu`;
  return formatDate(dateStr);
}
