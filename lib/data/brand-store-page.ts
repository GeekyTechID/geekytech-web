import "server-only";

import { createServiceClient } from "@/lib/supabase/server";
import type { BrandStoreCategoryOption, BrandStoreSortKey } from "@/lib/types/brand-store-catalog";
import {
  fetchTemplateBanners,
  productRowToShelf,
  type HomeShelfProduct,
  type ProductQueryRow,
  type StoreBanner,
} from "@/lib/data/home-storefront";

export const BRAND_STORE_PRODUCTS_PER_PAGE = 15;

export type BrandStorePublicBrand = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  /** Banner hero dari Admin → Brand (fallback jika tidak ada baris `banners` template `brand_main:{slug}`). */
  banner_url: string | null;
  /** Banner promosi tengah (fallback jika tidak ada template `brand_secondary:{slug}`). */
  banner_secondary_url: string | null;
};

export type BrandStoreAggregate = {
  avgRating: number;
  totalReviews: number;
  totalSold: number;
};

export type { BrandStoreCategoryOption, BrandStoreSortKey } from "@/lib/types/brand-store-catalog";

const PRODUCT_SHELF_SELECT = `id, name, slug, created_at, average_rating, review_count, total_sold, base_price, sale_price, condition,
  brands:brand_id(name),
  categories:category_id(name),
  product_images(url, is_primary, sort_order, alt_text),
  product_variants(id, price, name, is_active)`;

const SORT_KEYS = new Set<BrandStoreSortKey>([
  "latest",
  "price-asc",
  "price-desc",
  "name-asc",
  "name-desc",
  "best_selling",
]);

function normalizeSort(raw: string | undefined): BrandStoreSortKey {
  if (raw && SORT_KEYS.has(raw as BrandStoreSortKey)) return raw as BrandStoreSortKey;
  return "latest";
}

export async function fetchBrandBySlugForStore(slug: string): Promise<BrandStorePublicBrand | null> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("brands")
      .select("id, name, slug, logo_url, description, banner_url, banner_secondary_url")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();
    if (error || !data) return null;
    return {
      id: data.id,
      name: data.name,
      slug: data.slug,
      logo_url: data.logo_url,
      description: data.description ?? null,
      banner_url: data.banner_url ?? null,
      banner_secondary_url: data.banner_secondary_url ?? null,
    };
  } catch {
    return null;
  }
}

/** Fallback hero: gambar dari kolom `brands.banner_url` (satu strip). */
export function brandHeroBannersFromTable(brand: BrandStorePublicBrand): StoreBanner[] {
  const url = brand.banner_url?.trim();
  if (!url) return [];
  return [
    {
      id: `${brand.id}-table-banner-main`,
      title: brand.name,
      subtitle: null,
      image_url: url,
      link_url: null,
    },
  ];
}

/** Fallback tengah: gambar dari `brands.banner_secondary_url`. */
export function brandSecondaryBannersFromTable(brand: BrandStorePublicBrand): StoreBanner[] {
  const url = brand.banner_secondary_url?.trim();
  if (!url) return [];
  return [
    {
      id: `${brand.id}-table-banner-secondary`,
      title: brand.name,
      subtitle: null,
      image_url: url,
      link_url: null,
    },
  ];
}

export async function fetchBrandAggregateFromProducts(brandId: string): Promise<BrandStoreAggregate> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("products")
      .select("average_rating, review_count, total_sold")
      .eq("brand_id", brandId)
      .eq("is_active", true)
      .is("deleted_at", null);
    if (error || !data?.length) {
      return { avgRating: 0, totalReviews: 0, totalSold: 0 };
    }
    let weighted = 0;
    let reviews = 0;
    let sold = 0;
    for (const row of data) {
      const rc = row.review_count ?? 0;
      weighted += Number(row.average_rating ?? 0) * rc;
      reviews += rc;
      sold += row.total_sold ?? 0;
    }
    const avgRating = reviews > 0 ? weighted / reviews : 0;
    return { avgRating, totalReviews: reviews, totalSold: sold };
  } catch {
    return { avgRating: 0, totalReviews: 0, totalSold: 0 };
  }
}

export async function fetchBrandBestSellers(brandId: string, limit: number): Promise<HomeShelfProduct[]> {
  if (limit <= 0) return [];
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("products")
      .select(PRODUCT_SHELF_SELECT)
      .eq("brand_id", brandId)
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("total_sold", { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    const rows = data as unknown as ProductQueryRow[];
    const out: HomeShelfProduct[] = [];
    for (const row of rows) {
      const shelf = productRowToShelf(row);
      if (shelf) out.push(shelf);
    }
    return out;
  } catch {
    return [];
  }
}

export async function fetchBrandCategoryFilters(brandId: string): Promise<BrandStoreCategoryOption[]> {
  try {
    const supabase = createServiceClient();
    const { data: rows, error } = await supabase
      .from("products")
      .select("category_id")
      .eq("brand_id", brandId)
      .eq("is_active", true)
      .is("deleted_at", null);
    if (error || !rows?.length) return [];
    const ids = [...new Set(rows.map((r) => r.category_id).filter((id): id is string => id != null))];
    if (ids.length === 0) return [];
    const { data: cats, error: catErr } = await supabase
      .from("categories")
      .select("id, name, slug")
      .in("id", ids)
      .eq("is_active", true)
      .order("name", { ascending: true });
    if (catErr || !cats) return [];
    return cats.map((c) => ({ id: c.id, name: c.name, slug: c.slug }));
  } catch {
    return [];
  }
}

export type BrandProductsPageResult = {
  products: HomeShelfProduct[];
  totalCount: number;
};

export async function fetchBrandProductsPage(params: {
  brandId: string;
  page: number;
  q: string;
  categoryId: string | null;
  sort: string;
}): Promise<BrandProductsPageResult> {
  const page = Math.max(1, params.page);
  const sort = normalizeSort(params.sort);
  const q = params.q.trim();
  const categoryId = params.categoryId?.trim() || null;
  const from = (page - 1) * BRAND_STORE_PRODUCTS_PER_PAGE;
  const to = from + BRAND_STORE_PRODUCTS_PER_PAGE - 1;

  try {
    const supabase = createServiceClient();
    let query = supabase
      .from("products")
      .select(PRODUCT_SHELF_SELECT, { count: "exact" })
      .eq("brand_id", params.brandId)
      .eq("is_active", true)
      .is("deleted_at", null);

    if (q.length > 0) {
      query = query.ilike("name", `%${q}%`);
    }
    if (categoryId) {
      query = query.eq("category_id", categoryId);
    }

    switch (sort) {
      case "price-asc":
        query = query.order("base_price", { ascending: true });
        break;
      case "price-desc":
        query = query.order("base_price", { ascending: false });
        break;
      case "name-asc":
        query = query.order("name", { ascending: true });
        break;
      case "name-desc":
        query = query.order("name", { ascending: false });
        break;
      case "best_selling":
        query = query.order("total_sold", { ascending: false });
        break;
      default:
        query = query.order("created_at", { ascending: false });
        break;
    }

    const { data, error, count } = await query.range(from, to);
    if (error || !data) {
      return { products: [], totalCount: 0 };
    }
    const rows = data as unknown as ProductQueryRow[];
    const products: HomeShelfProduct[] = [];
    for (const row of rows) {
      const shelf = productRowToShelf(row);
      if (shelf) products.push(shelf);
    }
    return { products, totalCount: count ?? 0 };
  } catch {
    return { products: [], totalCount: 0 };
  }
}

export async function fetchPreFooterBanners(): Promise<StoreBanner[]> {
  return fetchTemplateBanners("pre_footer");
}
