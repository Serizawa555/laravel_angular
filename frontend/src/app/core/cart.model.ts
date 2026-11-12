export interface CartItem {
  id: number;
  quantity: number;
  unit_price: number;
  line_total: number;
  variant: {
    id: number;
    sku: string;
    stock: number;
    options: Record<string, string>;
  };
  product: { slug: string; name: string; brand: string | null };
}

export interface CartData {
  items: CartItem[];
  count: number;
  subtotal: number;
}
