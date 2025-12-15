import { supabase } from '@/integrations/supabase/client';

export interface HostingAccount {
  id: string;
  user_id: string;
  service_type: string;
  plan_name: string;
  status: string;
  account_username?: string;
  account_password?: string;
  control_panel_url?: string;
  nameservers?: string[];
  created_at?: string;
  activated_at?: string;
  expires_at?: string;
}

export async function createOrder(userId: string, items: any[], totals: { subtotal: number; discount: number; total: number }) {
  try {
    const { data, error } = await supabase.from('orders').insert({
      user_id: userId,
      status: 'pending',
      subtotal: totals.subtotal,
      discount: totals.discount,
      tax: 0,
      total: totals.total,
      items,
    }).select().limit(1);

    if (error) throw error;
    return data && data[0];
  } catch (e) {
    console.warn('createOrder fallback - returning local object', e);
    return { id: `local_${Date.now()}`, user_id: userId, items, total: totals.total };
  }
}

export async function createHostingAccount(userId: string, serviceType: string, planName: string, billingCycle: 'monthly' | 'annual' = 'monthly') {
  try {
    const username = `u_${Math.random().toString(36).slice(2, 9)}`;
    const password = Math.random().toString(36).slice(2, 10);
    const expiresAt = new Date();
    if (billingCycle === 'monthly') expiresAt.setMonth(expiresAt.getMonth() + 1);
    else expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    const { data, error } = await supabase.from('hosting_accounts').insert({
      user_id: userId,
      service_type: serviceType,
      plan_name: planName,
      status: 'active',
      account_username: username,
      account_password: password,
      control_panel_url: `https://${username}.hosting.local/`,
      nameservers: ['ns1.ks-foundation.test', 'ns2.ks-foundation.test'],
      activated_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
      billing_cycle: billingCycle,
      auto_renew: true,
    }).select().limit(1);

    if (error) throw error;
    return data && data[0];
  } catch (e) {
    console.warn('createHostingAccount fallback - returning local object', e);
    return {
      id: `local_host_${Date.now()}`,
      user_id: userId,
      service_type: serviceType,
      plan_name: planName,
      status: 'active',
      account_username: `u_${Math.random().toString(36).slice(2,8)}`,
      control_panel_url: 'https://local-hosting/',
    } as HostingAccount;
  }
}

export async function getUserHosting(userId: string) {
  try {
    const { data, error } = await supabase.from('hosting_accounts').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (error) {
      console.warn('getUserHosting error (table may not exist yet):', error);
      return [] as HostingAccount[];
    }
    return data || [];
  } catch (e) {
    console.warn('getUserHosting fallback', e);
    return [] as HostingAccount[];
  }
}
