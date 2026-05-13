export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type ChatTurn = { role: "user" | "assistant"; content: string };

export type ToolUse = { name: string; args: Record<string, unknown> };

export type ChatResponse = {
  reply: string;
  tools_used: ToolUse[];
  fallback?: string | null;
  model_used?: string | null;
  error?: string;
};

export async function sendChat(
  audience: "customer" | "owner",
  message: string,
  history: ChatTurn[] = [],
  customerPhone?: string,
  fastMode: boolean = false
): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/chat/${audience}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      history,
      customer_phone: customerPhone ?? null,
      fast_mode: fastMode,
    }),
  });
  if (!res.ok) {
    return {
      reply: `Sunucu hatası (${res.status}). Backend çalışıyor mu? (${API_BASE})`,
      tools_used: [],
      error: String(res.status),
    };
  }
  return res.json();
}

export type DashboardSummary = {
  orders_today: number;
  revenue_today: number;
  pending_shipments: number;
  delayed_shipments: number;
  low_stock_products: number;
  total_orders: number;
  total_revenue: number;
  top_products: { name: string; qty: number; unit: string; revenue: number }[];
  recent_orders: OrderOut[];
  stock_alerts: {
    id: number;
    product_id: number;
    product_name: string;
    stock: number;
    low_stock_threshold: number;
    created_at: string;
  }[];
  delayed_shipment_orders: OrderOut[];
  briefing: string;
  trend_orders_7d: number[];
  trend_revenue_7d: number[];
};

export type OrderOut = {
  id: number;
  status: string;
  total: number;
  created_at: string;
  customer_name: string;
  items: { product_name: string; qty: number; unit_price: number }[];
  shipment: {
    id: number;
    carrier: string;
    tracking_no: string;
    status: string;
    last_update: string;
    eta: string | null;
    delayed: boolean;
  } | null;
};

export async function getDashboard(): Promise<DashboardSummary> {
  const res = await fetch(`${API_BASE}/dashboard/summary`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Dashboard hatası: ${res.status}`);
  return res.json();
}

export type AIInsight = {
  severity: "high" | "medium" | "low";
  icon: string;
  title: string;
  message: string;
  action_label: string | null;
  action: "bulk_supplier" | "bulk_notify" | null;
};

export async function getInsights(): Promise<{ insights: AIInsight[]; generated_at: string }> {
  const res = await fetch(`${API_BASE}/dashboard/insights`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Insights hatası: ${res.status}`);
  return res.json();
}

export type ForecastItem = {
  product_id: number;
  name: string;
  unit: string;
  current_stock: number;
  daily_avg: number;
  projected_7d_sales: number;
  days_until_empty: number;
  risk: "high" | "medium" | "low";
};

export async function getForecast(): Promise<{ items: ForecastItem[]; generated_at: string }> {
  const res = await fetch(`${API_BASE}/dashboard/forecast`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Forecast hatası: ${res.status}`);
  return res.json();
}

export type BulkNotifyMessage = {
  order_id: number;
  customer_name: string;
  customer_phone: string;
  channel: string;
  message: string;
};

export async function bulkNotifyDelayed(): Promise<{ count: number; messages: BulkNotifyMessage[] }> {
  const res = await fetch(`${API_BASE}/dashboard/bulk/notify-delayed`, { method: "POST" });
  if (!res.ok) throw new Error(`Toplu bildirim hatası: ${res.status}`);
  return res.json();
}

export async function sendBulkNotifyDelayed(): Promise<{ sent: number; channel: string; note: string }> {
  const res = await fetch(`${API_BASE}/dashboard/bulk/notify-delayed/send`, { method: "POST" });
  if (!res.ok) throw new Error(`Gönderim hatası: ${res.status}`);
  return res.json();
}

export type BulkSupplierDraft = {
  product_id: number;
  product_name: string;
  current_stock: number;
  unit: string;
  suggested_qty: number;
  supplier_name: string;
  supplier_email: string;
  subject: string;
  body: string;
};

export async function bulkSupplierEmails(): Promise<{ count: number; drafts: BulkSupplierDraft[] }> {
  const res = await fetch(`${API_BASE}/dashboard/bulk/supplier-emails`, { method: "POST" });
  if (!res.ok) throw new Error(`Toplu mail hatası: ${res.status}`);
  return res.json();
}

export async function advanceOrderStatus(orderId: number): Promise<{
  order_id: number;
  new_status: string;
  new_status_tr: string;
}> {
  const res = await fetch(`${API_BASE}/dashboard/orders/${orderId}/advance`, {
    method: "POST",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `İlerletme hatası: ${res.status}`);
  }
  return res.json();
}

export async function refreshBriefing(): Promise<{ briefing: string }> {
  const res = await fetch(`${API_BASE}/dashboard/briefing`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Brifing hatası: ${res.status}`);
  return res.json();
}

export type CustomerNotification = {
  order_id: number;
  status: string;
  status_raw: string;
  total: number;
  item_count: number;
  first_item: string | null;
  created_at: string;
  shipment_eta: string | null;
  delayed: boolean;
  summary: string;
};

export type CustomerNotificationsResponse = {
  customer: { name: string; city: string; phone: string } | null;
  items: CustomerNotification[];
  generated_at?: string;
};

export async function getCustomerNotifications(
  phone: string
): Promise<CustomerNotificationsResponse> {
  const res = await fetch(
    `${API_BASE}/customer/notifications?phone=${encodeURIComponent(phone)}`,
    { cache: "no-store" }
  );
  if (!res.ok) throw new Error(`Bildirim hatası: ${res.status}`);
  return res.json();
}

export type Campaign = {
  id: string;
  title: string;
  tagline: string;
  emoji: string;
  valid_until: string;
  cta_prompt: string;
  tag: string;
};

export async function getCampaigns(): Promise<{ items: Campaign[]; generated_at: string }> {
  const res = await fetch(`${API_BASE}/customer/campaigns`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Kampanya hatası: ${res.status}`);
  return res.json();
}

export type HelpFAQ = { q: string; a: string };
export type HelpContact = {
  hours: string;
  phone: string;
  email: string;
  address: string;
};

export async function getCustomerHelp(): Promise<{ faq: HelpFAQ[]; contact: HelpContact }> {
  const res = await fetch(`${API_BASE}/customer/help`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Yardım hatası: ${res.status}`);
  return res.json();
}

export type ActivityEvent = {
  kind: "real" | "scheduled";
  at: string;
  icon: "send" | "sparkles" | "mail";
  title: string;
  detail: string;
  channel: "whatsapp" | "email" | "system";
};

export async function getActivityFeed(days: number = 7): Promise<{
  items: ActivityEvent[];
  generated_at: string;
  note: string;
}> {
  const res = await fetch(`${API_BASE}/dashboard/activity?days=${days}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Aktivite hatası: ${res.status}`);
  return res.json();
}

export async function triggerAutomationNow(): Promise<{ written: string[]; tick_at: string }> {
  const res = await fetch(`${API_BASE}/dashboard/automation/trigger`, { method: "POST" });
  if (!res.ok) throw new Error(`Tetikleme hatası: ${res.status}`);
  return res.json();
}

export async function markShipmentDelivered(shipmentId: number): Promise<{
  shipment_id: number;
  order_id: number;
  status: string;
  at: string;
}> {
  const res = await fetch(`${API_BASE}/dashboard/shipments/${shipmentId}/deliver`, { method: "POST" });
  if (!res.ok) throw new Error(`Webhook hatası: ${res.status}`);
  return res.json();
}

export type SupplierEmailItem = {
  id: number;
  product_id: number;
  product_name: string;
  supplier_name: string;
  supplier_email: string;
  subject: string;
  body: string;
  sent_at: string;
  auto: boolean;
  suggested_qty: number;
  unit: string;
};

export async function getSupplierInbox(): Promise<{
  items: SupplierEmailItem[];
  supplier_count: number;
  total: number;
  generated_at: string;
}> {
  const res = await fetch(`${API_BASE}/supplier/inbox`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Tedarikçi inbox hatası: ${res.status}`);
  return res.json();
}

export async function sendSupplierEmail(productId: number): Promise<{
  id: number;
  product_name: string;
  supplier_email: string;
  sent_at: string;
}> {
  const res = await fetch(`${API_BASE}/supplier/send/${productId}`, { method: "POST" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Gönderim hatası: ${res.status}`);
  }
  return res.json();
}

export type CarrierItem = {
  shipment_id: number;
  order_id: number;
  carrier: string;
  tracking_no: string;
  status: string;
  status_label: string;
  priority: number;
  eta: string | null;
  delayed: boolean;
  last_update: string;
  customer_name: string;
  customer_phone: string;
  customer_city: string;
  products: string[];
  total: number;
};

export async function getCarrierDashboard(): Promise<{
  items: CarrierItem[];
  counts: {
    delivering: number;
    in_transit: number;
    picked_up: number;
    label_created: number;
    delayed: number;
    total_active: number;
  };
  generated_at: string;
}> {
  const res = await fetch(`${API_BASE}/carrier/dashboard`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Kargo paneli hatası: ${res.status}`);
  return res.json();
}

export type CustomerListItem = {
  id: number;
  name: string;
  phone: string;
  city: string;
  initials: string;
};

export async function getCustomerList(): Promise<{ items: CustomerListItem[] }> {
  const res = await fetch(`${API_BASE}/customer/list`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Hesap listesi hatası: ${res.status}`);
  return res.json();
}

export async function draftSupplierEmail(productId: number): Promise<{
  product_name: string;
  current_stock: number;
  unit: string;
  suggested_qty: number;
  supplier_name: string;
  supplier_email: string;
  subject: string;
  body: string;
  last_14_days_sales: number;
}> {
  const res = await fetch(
    `${API_BASE}/dashboard/draft-supplier-email/${productId}`,
    { method: "POST" }
  );
  if (!res.ok) throw new Error(`Mail taslağı hatası: ${res.status}`);
  return res.json();
}
