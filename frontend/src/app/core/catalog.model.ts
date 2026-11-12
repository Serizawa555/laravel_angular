export type ProductType = 'phone' | 'case' | 'headset_bt' | 'headset_wired';

export interface ProductCard {
  id: number;
  slug: string;
  type: ProductType;
  name: string;
  short_description: string | null;
  brand: string | null;
  brand_slug: string | null;
  segment: string | null;
  from_price: number; // bani
  compare_at_price: number | null;
  in_stock: boolean;
  is_featured: boolean;
  featured_position: number | null;
  image: string | null;
  default_variant_id?: number | null;
  variant_count?: number;
}

export interface OptionValueRef {
  id: number;
  type: string;
  code: string;
  label: string;
  meta: { hex?: string; gb?: number } | null;
}

export interface Variant {
  id: number;
  sku: string;
  price: number;
  compare_at_price: number | null;
  stock: number;
  is_default: boolean;
  options: Record<string, string>; // axis -> option code
  option_values: OptionValueRef[];
}

export interface SpecRow {
  key: string;
  label: string;
  unit: string | null;
  data_type: string;
  value: unknown;
}

export interface SpecGroup {
  group: string;
  rows: SpecRow[];
}

export interface ProductDetail {
  id: number;
  slug: string;
  type: ProductType;
  name: string;
  short_description: string | null;
  description: string | null;
  brand: { slug: string; name: string } | null;
  segment: { slug: string; name: string } | null;
  base_price: number;
  from_price: number;
  is_featured: boolean;
  status: string;
  variants: Variant[];
  spec_groups: SpecGroup[];
  compatible: ProductCard[];
  related: ProductCard[];
  image: string | null;
}

export interface Paginated<T> {
  data: T[];
  meta: { current_page: number; last_page: number; total: number; per_page: number };
}

export interface TermFacet {
  slug: string;
  name: string;
  count: number;
}

export interface OptionFacet {
  code: string;
  label: string;
  meta: { hex?: string; gb?: number } | null;
  count: number;
}

export interface Facets {
  type: { value: ProductType; count: number }[];
  brand: TermFacet[];
  segment: TermFacet[];
  color: OptionFacet[];
  ram: OptionFacet[];
  storage: OptionFacet[];
  price: { min: number; max: number };
}

export interface TermRef {
  id: number;
  slug: string;
  name: string;
  weight: number;
}

export interface Vocabulary {
  code: string;
  name: string;
  terms: TermRef[];
}
