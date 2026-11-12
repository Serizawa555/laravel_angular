export interface OrderItemJson {
  order_item_id: number;
  product_id: number | null;
  variant_id: number | null;
  sku: string;
  name: string;
  options: Record<string, string> | null;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export interface OrderJson {
  order_id: number;
  order_number: string;
  created_at: string | null;
  status: string;
  currency: string;
  locale: string;
  customer: { name: string; email: string; phone: string | null };
  payment: { provider: string; reference: string | null; status: string | null };
  items: OrderItemJson[];
  totals: { subtotal: number; shipping: number; total: number };
}

export interface OrderSummary {
  number: string;
  status: string;
  total: number;
  currency: string;
  created_at: string | null;
}

export interface CheckoutInput {
  name: string;
  email: string;
  phone?: string;
  shipping_address?: { line1?: string; city?: string; country?: string };
  card: { number: string; exp?: string; cvc?: string };
}
