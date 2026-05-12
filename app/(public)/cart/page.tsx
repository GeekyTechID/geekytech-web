import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { formatRupiah } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function CartPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?redirectTo=${encodeURIComponent("/cart")}`);
  }

  const { data: cart } = await supabase.from("carts").select("id").eq("user_id", user.id).maybeSingle();
  if (!cart) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center text-[#1d1d1f]">
        <h1 className="text-2xl font-semibold">Keranjang</h1>
        <p className="mt-3 text-[17px] text-[#7a7a7a]">Keranjang Anda masih kosong.</p>
        <Link href="/" className="mt-8 inline-block text-[15px] font-semibold text-[#EA5329] hover:underline">
          Lanjut belanja
        </Link>
      </div>
    );
  }

  const { data: rows } = await supabase
    .from("cart_items")
    .select(
      "id, quantity, product_variants(id, name, price, products(id, name, slug, product_images(url, is_primary, sort_order)))",
    )
    .eq("cart_id", cart.id);

  type Row = {
    id: string;
    quantity: number;
    product_variants: {
      id: string;
      name: string;
      price: number;
      products: {
        id: string;
        name: string;
        slug: string;
        product_images: { url: string; is_primary: boolean | null; sort_order: number | null }[] | null;
      } | null;
    } | null;
  };

  const items = (rows ?? []) as unknown as Row[];
  const lines = items
    .map((r) => {
      const v = r.product_variants;
      const p = v?.products;
      if (!v || !p) return null;
      const imgs = p.product_images ?? [];
      const img = imgs.find((i) => i.is_primary) ?? [...imgs].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))[0];
      return {
        lineId: r.id,
        qty: r.quantity,
        variantName: v.name,
        unit: Number(v.price),
        productName: p.name,
        slug: p.slug,
        imageUrl: img?.url ?? null,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x != null);

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center text-[#1d1d1f]">
        <h1 className="text-2xl font-semibold">Keranjang</h1>
        <p className="mt-3 text-[17px] text-[#7a7a7a]">Belum ada barang di keranjang.</p>
        <Link href="/" className="mt-8 inline-block text-[15px] font-semibold text-[#EA5329] hover:underline">
          Lanjut belanja
        </Link>
      </div>
    );
  }

  const total = lines.reduce((s, l) => s + l.unit * l.qty, 0);

  return (
    <div className="mx-auto max-w-[720px] px-4 py-12 text-[#1d1d1f]">
      <h1 className="text-2xl font-semibold tracking-tight">Keranjang</h1>
      <ul className="mt-8 divide-y divide-[#e0e0e0] border-y border-[#e0e0e0]">
        {lines.map((l) => (
          <li key={l.lineId} className="flex gap-4 py-5">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-[#e0e0e0] bg-[#f5f5f7]">
              {l.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={l.imageUrl} alt="" className="h-full w-full object-contain p-1" />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <Link href={`/products/${l.slug}`} className="font-semibold hover:text-[#EA5329]">
                {l.productName}
              </Link>
              <p className="text-sm text-[#7a7a7a]">{l.variantName}</p>
              <p className="mt-1 text-sm">
                {l.qty} × {formatRupiah(l.unit)}
              </p>
            </div>
            <p className="shrink-0 font-semibold">{formatRupiah(l.unit * l.qty)}</p>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex items-center justify-between text-[17px]">
        <span className="text-[#7a7a7a]">Total</span>
        <span className="font-bold">{formatRupiah(total)}</span>
      </div>
      <p className="mt-8 text-center text-sm text-[#7a7a7a]">Checkout penuh akan menyusul. Barang sudah tersimpan di keranjang.</p>
      <Link href="/" className="mt-4 block text-center text-[15px] font-semibold text-[#EA5329] hover:underline">
        Lanjut belanja
      </Link>
    </div>
  );
}
