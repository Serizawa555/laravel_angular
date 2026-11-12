import { ProductType } from './catalog.model';

export type Locale = 'en' | 'ro';
export type Translated = Partial<Record<Locale, string>>;

export interface AdminVariant {
  id?: number;
  sku: string;
  price: number;
  compare_at_price: number | null;
  stock: number;
  is_default: boolean;
  options: Record<string, string>;
}

export interface AdminProduct {
  id: number;
  type: ProductType;
  slug: string;
  sku_base: string | null;
  brand_id: number | null;
  segment_id: number | null;
  name: Translated;
  short_description: Translated;
  description: Translated;
  specs: Record<string, unknown>;
  base_price: number;
  status: string;
  is_featured: boolean;
  featured_position: number | null;
  deleted_at: string | null;
  media?: { id: number; thumb: string; url: string }[];
  variants?: AdminVariant[];
}

export interface AdminProductInput {
  type: ProductType;
  slug: string;
  sku_base?: string | null;
  brand_id?: number | null;
  segment_id?: number | null;
  name: Translated;
  short_description?: Translated;
  description?: Translated;
  specs: Record<string, unknown>;
  base_price: number;
  variants: AdminVariant[];
}

export interface AttributeDefinition {
  id: number;
  product_type: ProductType;
  key: string;
  label: Translated;
  data_type: 'string' | 'int' | 'decimal' | 'bool' | 'enum' | 'list';
  unit: string | null;
  options: string[] | null;
  group: string | null;
  is_filterable: boolean;
  is_required: boolean;
  sort: number;
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  roles: string[];
}

export interface FeaturedItem {
  id: number;
  slug: string;
  name: string;
  featured_position: number;
}

export interface AdminOrderRow {
  number: string;
  name: string;
  email: string;
  status: string;
  total: number;
  currency: string;
  created_at: string | null;
}

export interface AdminTerm {
  id: number;
  slug: string;
  name: Translated;
  weight: number;
}

export interface AdminVocabulary {
  id: number;
  code: string;
  name: Translated;
  terms: AdminTerm[];
}

export interface TermInput {
  vocabulary_id: number;
  name: Translated;
  slug: string;
  weight: number;
}

export interface AttributeDefinitionInput {
  product_type: ProductType;
  key: string;
  label: Translated;
  data_type: AttributeDefinition['data_type'];
  unit?: string | null;
  options?: string[] | null;
  group?: string | null;
  is_filterable: boolean;
  is_required: boolean;
  sort: number;
}

export interface ActivityEntry {
  id: number;
  description: string;
  log_name: string;
  subject_type: string;
  subject_id: number | null;
  causer: string | null;
  changes: unknown;
  created_at: string | null;
}
