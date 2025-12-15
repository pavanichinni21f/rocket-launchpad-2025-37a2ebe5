# Production Implementation - Code Architecture & Development Map

## 🎯 PRIORITY 1: SHOPPING CART SYSTEM (8 Hours)

### Database Migration
```sql
-- supabase/migrations/20251215_shopping_cart.sql
CREATE TABLE cart_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_id TEXT NOT NULL, -- 'shared-monthly', 'vps-annual', etc
  quantity INT DEFAULT 1,
  addon_ids TEXT[] DEFAULT '{}', -- JSON array of selected addons
  configuration JSONB DEFAULT '{}', -- Custom config (RAM, CPU, etc)
  price_override DECIMAL DEFAULT NULL, -- For promotional pricing
  added_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, service_id) -- One line per service per user
);

CREATE TABLE coupon_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR UNIQUE NOT NULL,
  discount_type VARCHAR ('percentage', 'fixed'),
  discount_value DECIMAL NOT NULL,
  expiry_date DATE,
  max_uses INT,
  current_uses INT DEFAULT 0,
  active BOOLEAN DEFAULT TRUE
);

-- Enable RLS
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only see their cart"
  ON cart_items FOR ALL
  USING (user_id = auth.uid());

ALTER TABLE coupon_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coupon codes are readable by all"
  ON coupon_codes FOR SELECT
  USING (TRUE);
```

### Service Files
```typescript
// src/services/cartService.ts
import { supabase } from '@/integrations/supabase/client';

export interface CartItem {
  id: string;
  user_id: string;
  service_id: string;
  quantity: number;
  addon_ids: string[];
  configuration: Record<string, any>;
  price_override: number | null;
  added_at: string;
}

// Add item to cart
export async function addToCart(
  userId: string,
  serviceId: string,
  config: Record<string, any> = {},
  addons: string[] = []
) {
  const { data, error } = await supabase
    .from('cart_items')
    .upsert({
      user_id: userId,
      service_id: serviceId,
      configuration: config,
      addon_ids: addons,
      quantity: 1,
    })
    .select();
  
  if (error) throw error;
  return data?.[0];
}

// Remove from cart
export async function removeFromCart(userId: string, serviceId: string) {
  const { error } = await supabase
    .from('cart_items')
    .delete()
    .eq('user_id', userId)
    .eq('service_id', serviceId);
  
  if (error) throw error;
}

// Get cart contents
export async function getCart(userId: string) {
  const { data, error } = await supabase
    .from('cart_items')
    .select('*')
    .eq('user_id', userId)
    .order('added_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

// Clear entire cart
export async function clearCart(userId: string) {
  const { error } = await supabase
    .from('cart_items')
    .delete()
    .eq('user_id', userId);
  
  if (error) throw error;
}

// Update quantity
export async function updateCartQuantity(
  userId: string,
  serviceId: string,
  quantity: number
) {
  const { data, error } = await supabase
    .from('cart_items')
    .update({ quantity })
    .eq('user_id', userId)
    .eq('service_id', serviceId)
    .select();
  
  if (error) throw error;
  return data?.[0];
}

// Apply coupon code
export async function applyCoupon(code: string, userId: string) {
  const { data, error } = await supabase
    .from('coupon_codes')
    .select('*')
    .eq('code', code.toUpperCase())
    .eq('active', true)
    .single();
  
  if (error || !data) throw new Error('Invalid coupon code');
  
  // Check expiry
  if (data.expiry_date && new Date(data.expiry_date) < new Date()) {
    throw new Error('Coupon has expired');
  }
  
  // Check max uses
  if (data.max_uses && data.current_uses >= data.max_uses) {
    throw new Error('Coupon usage limit reached');
  }
  
  return data;
}

// Calculate cart total
export async function calculateCartTotal(
  userId: string,
  couponCode?: string
): Promise<{
  subtotal: number;
  discount: number;
  total: number;
  coupon?: { code: string; discount_value: number };
}> {
  const items = await getCart(userId);
  
  let subtotal = 0;
  const serviceConfig = getServicePricingConfig(); // See below
  
  for (const item of items) {
    const price = serviceConfig[item.service_id]?.price || 0;
    subtotal += price * item.quantity;
  }
  
  let discount = 0;
  let appliedCoupon = null;
  
  if (couponCode) {
    try {
      const coupon = await applyCoupon(couponCode, userId);
      appliedCoupon = coupon;
      
      if (coupon.discount_type === 'percentage') {
        discount = subtotal * (coupon.discount_value / 100);
      } else {
        discount = coupon.discount_value;
      }
    } catch (e) {
      // Invalid coupon, ignore
    }
  }
  
  return {
    subtotal,
    discount,
    total: Math.max(0, subtotal - discount),
    coupon: appliedCoupon ? {
      code: appliedCoupon.code,
      discount_value: appliedCoupon.discount_value,
    } : undefined,
  };
}

// Pricing configuration (same as Billing.tsx)
function getServicePricingConfig() {
  return {
    'shared-monthly': { price: 4.99, name: 'Shared Hosting - Monthly' },
    'shared-annual': { price: 49.99, name: 'Shared Hosting - Annual' },
    'vps-monthly': { price: 19.99, name: 'VPS - Monthly' },
    'vps-annual': { price: 199.99, name: 'VPS - Annual' },
    'cloud-monthly': { price: 99.99, name: 'Cloud - Monthly' },
    'cloud-annual': { price: 999.99, name: 'Cloud - Annual' },
    'wordpress-monthly': { price: 9.99, name: 'WordPress - Monthly' },
    'wordpress-annual': { price: 99.99, name: 'WordPress - Annual' },
  };
}
```

### Components
```typescript
// src/components/cart/CartPage.tsx
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Trash2, ShoppingCart, ArrowRight } from 'lucide-react';
import {
  getCart,
  removeFromCart,
  updateCartQuantity,
  calculateCartTotal,
  applyCoupon,
  clearCart,
} from '@/services/cartService';
import { createCheckoutSession } from '@/services/paymentService';

const CartPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [couponCode, setCouponCode] = useState('');
  const [totals, setTotals] = useState({ subtotal: 0, discount: 0, total: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) loadCart();
  }, [user]);

  const loadCart = async () => {
    try {
      const cartItems = await getCart(user!.id);
      setItems(cartItems);
      const totals = await calculateCartTotal(user!.id);
      setTotals(totals);
    } catch (error) {
      toast.error('Failed to load cart');
    }
  };

  const handleRemove = async (serviceId: string) => {
    try {
      await removeFromCart(user!.id, serviceId);
      await loadCart();
      toast.success('Item removed from cart');
    } catch (error) {
      toast.error('Failed to remove item');
    }
  };

  const handleApplyCoupon = async () => {
    try {
      await applyCoupon(couponCode, user!.id);
      const totals = await calculateCartTotal(user!.id, couponCode);
      setTotals(totals);
      toast.success('Coupon applied!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Invalid coupon');
    }
  };

  const handleCheckout = async () => {
    if (items.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    setLoading(true);
    try {
      const session = await createCheckoutSession(user!.id, {
        items: items.map(i => ({
          service_id: i.service_id,
          quantity: i.quantity,
          price: getServicePrice(i.service_id),
        })),
        coupon_code: couponCode,
        cart_items: items,
      });
      
      if (session.url) window.location.href = session.url;
    } catch (error) {
      toast.error('Failed to create checkout session');
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <DashboardLayout>
        <Card className="text-center py-16">
          <ShoppingCart className="mx-auto mb-4 text-gray-400" size={48} />
          <p className="text-gray-500 mb-4">Your cart is empty</p>
          <Button onClick={() => navigate('/billing')}>
            Browse Services
          </Button>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cart Items */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Shopping Cart ({items.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.service_id}
                  className="flex justify-between items-center p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-semibold">{item.service_id}</p>
                    <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                  </div>
                  <p className="font-semibold">
                    ${(getServicePrice(item.service_id) * item.quantity).toFixed(2)}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove(item.service_id)}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Order Summary */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>${totals.subtotal.toFixed(2)}</span>
              </div>
              
              {totals.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount:</span>
                  <span>-${totals.discount.toFixed(2)}</span>
                </div>
              )}
              
              <div className="border-t pt-4 flex justify-between font-bold">
                <span>Total:</span>
                <span>${totals.total.toFixed(2)}</span>
              </div>

              {/* Coupon Input */}
              <div className="space-y-2">
                <label className="text-sm">Coupon Code (Optional)</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  />
                  <Button
                    variant="outline"
                    onClick={handleApplyCoupon}
                    disabled={!couponCode}
                  >
                    Apply
                  </Button>
                </div>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={handleCheckout}
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Proceed to Checkout'}
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate('/billing')}
              >
                Continue Shopping
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

function getServicePrice(serviceId: string): number {
  const prices: Record<string, number> = {
    'shared-monthly': 4.99,
    'shared-annual': 49.99,
    'vps-monthly': 19.99,
    'vps-annual': 199.99,
    'cloud-monthly': 99.99,
    'cloud-annual': 999.99,
    'wordpress-monthly': 9.99,
    'wordpress-annual': 99.99,
  };
  return prices[serviceId] || 0;
}

export default CartPage;
```

### Update Billing Page
```typescript
// In src/pages/Billing.tsx - Update the plan button handlers

const handleSelectPlan = (planName: string, billing: 'monthly' | 'annual') => {
  const serviceId = `${planName.toLowerCase()}-${billing}`;
  
  // Add to cart instead of direct checkout
  addToCart(user!.id, serviceId).then(() => {
    toast.success(`${planName} added to cart`);
    navigate('/cart');
  });
};
```

---

## 🎯 PRIORITY 2: HOSTING ACCOUNTS & ORDERS (20 Hours)

### Database Migration
```sql
-- supabase/migrations/20251215_hosting_orders.sql

CREATE TABLE hosting_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_type VARCHAR NOT NULL, -- 'shared', 'vps', 'cloud', 'wordpress'
  plan_name VARCHAR NOT NULL, -- 'starter', 'professional', 'enterprise'
  status VARCHAR DEFAULT 'pending', -- 'pending', 'active', 'suspended', 'cancelled'
  
  -- Provisioning info
  account_username VARCHAR UNIQUE,
  account_password VARCHAR,
  control_panel_url VARCHAR,
  nameservers TEXT[],
  
  -- Dates
  created_at TIMESTAMP DEFAULT NOW(),
  activated_at TIMESTAMP,
  expires_at TIMESTAMP,
  renewal_date TIMESTAMP,
  
  -- Metadata
  billing_cycle VARCHAR, -- 'monthly', 'annual'
  auto_renew BOOLEAN DEFAULT TRUE,
  
  UNIQUE(user_id, service_type, id) -- Multiple accounts allowed
);

CREATE TABLE orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'cancelled'
  
  -- Pricing
  subtotal DECIMAL NOT NULL,
  discount DECIMAL DEFAULT 0,
  tax DECIMAL DEFAULT 0,
  total DECIMAL NOT NULL,
  
  -- Payment
  stripe_session_id VARCHAR,
  stripe_payment_intent_id VARCHAR,
  
  -- Items
  items JSONB NOT NULL, -- Stores cart items
  
  -- Dates
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  expires_at TIMESTAMP,
  renewal_date TIMESTAMP,
  
  -- Renewal
  is_renewal BOOLEAN DEFAULT FALSE,
  renewal_of_hosting_id UUID REFERENCES hosting_accounts(id)
);

CREATE TABLE order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  hosting_account_id UUID REFERENCES hosting_accounts(id),
  service_type VARCHAR NOT NULL,
  plan_name VARCHAR NOT NULL,
  billing_cycle VARCHAR NOT NULL,
  price DECIMAL NOT NULL,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE hosting_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see their hosting accounts"
  ON hosting_accounts FOR ALL
  USING (user_id = auth.uid());

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see their orders"
  ON orders FOR ALL
  USING (user_id = auth.uid());

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see their order items"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );
```

### Services
```typescript
// src/services/hostingService.ts

export interface HostingAccount {
  id: string;
  user_id: string;
  service_type: 'shared' | 'vps' | 'cloud' | 'wordpress';
  plan_name: string;
  status: 'pending' | 'active' | 'suspended' | 'cancelled';
  account_username: string;
  control_panel_url: string;
  nameservers: string[];
  created_at: string;
  activated_at?: string;
  expires_at: string;
  renewal_date: string;
  billing_cycle: 'monthly' | 'annual';
  auto_renew: boolean;
}

export interface Order {
  id: string;
  user_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  items: any[];
  created_at: string;
  completed_at?: string;
  expires_at: string;
  renewal_date: string;
  stripe_session_id?: string;
}

// Create order from cart
export async function createOrder(
  userId: string,
  cartItems: any[],
  totals: any
): Promise<Order> {
  const { data, error } = await supabase
    .from('orders')
    .insert({
      user_id: userId,
      status: 'pending',
      subtotal: totals.subtotal,
      discount: totals.discount,
      tax: 0,
      total: totals.total,
      items: cartItems,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Get user's orders
export async function getUserOrders(userId: string): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

// Get order details
export async function getOrderDetails(orderId: string): Promise<Order> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();
  
  if (error) throw error;
  return data;
}

// Create hosting account (called after successful payment)
export async function createHostingAccount(
  userId: string,
  serviceType: string,
  planName: string,
  billingCycle: 'monthly' | 'annual'
): Promise<HostingAccount> {
  // Generate credentials
  const username = generateUsername(userId, serviceType);
  const password = generatePassword();
  const expiresAt = calculateExpiryDate(billingCycle);
  
  const { data, error } = await supabase
    .from('hosting_accounts')
    .insert({
      user_id: userId,
      service_type: serviceType,
      plan_name: planName,
      status: 'active',
      account_username: username,
      account_password: password,
      control_panel_url: `https://cpanel.${generateDomain()}/`,
      nameservers: ['ns1.ks-foundation.com', 'ns2.ks-foundation.com'],
      activated_at: new Date().toISOString(),
      expires_at: expiresAt,
      renewal_date: expiresAt,
      billing_cycle: billingCycle,
      auto_renew: true,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Get user's hosting accounts
export async function getUserHosting(userId: string): Promise<HostingAccount[]> {
  const { data, error } = await supabase
    .from('hosting_accounts')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

// Get hosting account details
export async function getHostingDetails(accountId: string): Promise<HostingAccount> {
  const { data, error } = await supabase
    .from('hosting_accounts')
    .select('*')
    .eq('id', accountId)
    .single();
  
  if (error) throw error;
  return data;
}

// Suspend hosting account
export async function suspendHosting(accountId: string): Promise<void> {
  const { error } = await supabase
    .from('hosting_accounts')
    .update({ status: 'suspended' })
    .eq('id', accountId);
  
  if (error) throw error;
}

// Cancel hosting account
export async function cancelHosting(accountId: string): Promise<void> {
  const { error } = await supabase
    .from('hosting_accounts')
    .update({ status: 'cancelled' })
    .eq('id', accountId);
  
  if (error) throw error;
}

// Helper functions
function generateUsername(userId: string, serviceType: string): string {
  const timestamp = Date.now().toString(36).substring(5);
  return `user_${serviceType.substring(0, 3)}_${timestamp}`;
}

function generatePassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$';
  let password = '';
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

function calculateExpiryDate(billingCycle: 'monthly' | 'annual'): string {
  const date = new Date();
  if (billingCycle === 'monthly') {
    date.setMonth(date.getMonth() + 1);
  } else {
    date.setFullYear(date.getFullYear() + 1);
  }
  return date.toISOString();
}

function generateDomain(): string {
  return `hosting-${Math.random().toString(36).substring(7)}.ks-foundation.com`;
}
```

---

## 📋 REMAINING GAPS BY PRIORITY

### Priority 3: Order Management Page (8 hours)
- [ ] Order history list
- [ ] Order detail page
- [ ] Invoice viewing/download
- [ ] Order status tracking

### Priority 4: Control Panel (40 hours)
- [ ] Service dashboard
- [ ] File manager
- [ ] Database management
- [ ] Email management
- [ ] SSL installation
- [ ] Resource graphs

### Priority 5: Support System (10 hours)
- [ ] Ticket creation
- [ ] Ticket management
- [ ] Real-time updates
- [ ] KB articles

### Priority 6: Monitoring (12 hours)
- [ ] Uptime tracking
- [ ] Server metrics
- [ ] Alerts system
- [ ] Status page

### Priority 7: Growth Features (20+ hours)
- [ ] Affiliate program
- [ ] Advanced analytics
- [ ] Automation system
- [ ] Advanced pricing

---

## 🚀 DEPLOYMENT CHECKLIST

### Pre-Launch
- [ ] All migrations applied
- [ ] Environment variables set
- [ ] Stripe webhooks configured
- [ ] Email service tested
- [ ] Database backups enabled
- [ ] SSL certificate installed
- [ ] Domain DNS configured
- [ ] Load balancer set up

### Launch Day
- [ ] User testing completed
- [ ] Payment flow tested
- [ ] Support system ready
- [ ] Monitoring active
- [ ] Incident response plan ready

### Post-Launch
- [ ] Daily backups verified
- [ ] Performance monitoring active
- [ ] Error tracking enabled
- [ ] Support queue processed
- [ ] Metrics tracked

---

This is the complete map. Pick a priority and start building! 🚀
