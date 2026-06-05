import { HomeProductTile } from "@/components/store/home-product-tile";
import type { OtherBrandCategoryGroup } from "@/lib/data/product-detail-page";

type ProductDetailOtherBrandsSectionProps = {
  groups: OtherBrandCategoryGroup[];
};

export function ProductDetailOtherBrandsSection({ groups }: ProductDetailOtherBrandsSectionProps) {
  if (groups.length === 0) return null;

  return (
    <section className="border-t border-[#e0e0e0] bg-white py-14 md:py-16" aria-labelledby="other-brands-heading">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <h2 id="other-brands-heading" className="mb-10 text-[clamp(1.25rem,3vw,1.5rem)] font-semibold text-[#1d1d1f]">
          Produk lainnya di brand lain
        </h2>

        {groups.map((group) => (
          <div key={group.categorySlug} className="mb-14 last:mb-0">
            <h3 className="mb-5 text-xs font-semibold uppercase text-[#7a7a7a]">{group.categoryName}</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-5 md:gap-5">
              {group.products.map((p) => (
                <div key={`${p.productId}-${p.variantId}`} className="min-w-0">
                  <HomeProductTile
                    product={p}
                    layout="promoRow"
                    className="h-full overflow-hidden rounded-2xl border border-[#e0e0e0] bg-white"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
