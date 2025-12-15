import { supabase } from '@/integrations/supabase/client';

export interface CartItem {
  id?: string;
  user_id: string;
  service_id: string;
  quantity: number;
  addon_ids?: string[];
  configuration?: Record<string, any>;
  price_override?: number | null;
  added_at?: string;
}

export async function addToCart(userId: string, serviceId: string, config: Record<string, any> = {}, addons: string[] = []) {
  const payload = {
    user_id: userId,
    service_id: serviceId,
    configuration: config,
    addon_ids: addons,
    quantity: 1,
  };

  // Upsert so user only has one line per service
  const { data, error } = await supabase
    .from('cart_items')
    .upsert(payload, { onConflict: ['user_id', 'service_id'] })
    .select()
    .limit(1);

  if (error) {
    console.warn('addToCart error (table may not exist yet):', error);
    // For local/demo environments, return local representation
    return payload as CartItem;
  }

  return (data && data[0]) || payload;
}

export async function removeFromCart(userId: string, serviceId: string) {
  const { error } = await supabase.from('cart_items').delete().eq('user_id', userId).eq('service_id', serviceId);
  if (error) throw error;
}

export async function getCart(userId: string) {
  const { data, error } = await supabase.from('cart_items').select('*').eq('user_id', userId).order('added_at', { ascending: false });
  if (error) {
    console.warn('getCart error (table may not exist yet):', error);
    return [] as CartItem[];
  }
  return (data || []) as CartItem[];
}

export async function clearCart(userId: string) {
  const { error } = await supabase.from('cart_items').delete().eq('user_id', userId);
  if (error) throw error;
}

export async function updateCartQuantity(userId: string, serviceId: string, quantity: number) {
  const { data, error } = await supabase
    .from('cart_items')
    .update({ quantity })
    .eq('user_id', userId)
    .eq('service_id', serviceId)
    .select()
    .limit(1);

  if (error) throw error;
  return data && data[0];
}

export function getServicePricingConfig() {
  return {
    'shared-monthly': { price: 4.99, name: 'Shared Hosting - Monthly' },
    'shared-annual': { price: 49.99, name: 'Shared Hosting - Annual' },
    'vps-monthly': { price: 19.99, name: 'VPS - Monthly' },
    'vps-annual': { price: 199.99, name: 'VPS - Annual' },
    'cloud-monthly': { price: 99.99, name: 'Cloud - Monthly' },
    'cloud-annual': { price: 999.99, name: 'Cloud - Annual' },
    'wordpress-monthly': { price: 9.99, name: 'WordPress - Monthly' },
    'wordpress-annual': { price: 99.99, name: 'WordPress - Annual' },
  } as Record<string, { price: number; name: string }>;
}

export async function calculateCartTotal(userId: string, couponCode?: string) {
  const items = await getCart(userId);
  const config = getServicePricingConfig();
  let subtotal = 0;
  for (const item of items) {
    const price = config[item.service_id]?.price || 0;
    subtotal += price * (item.quantity || 1);
  }

  // Basic coupon handling placeholder
  let discount = 0;
  if (couponCode === 'TEST10') discount = subtotal * 0.1;

  const total = Math.max(0, subtotal - discount);
  return { subtotal, discount, total };
}
