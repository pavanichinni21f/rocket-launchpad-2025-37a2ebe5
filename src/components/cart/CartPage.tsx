import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { getCart, removeFromCart, calculateCartTotal, updateCartItemQuantity, type Cart, type CartItem } from '@/services/cartService';
import { createOrderFromCart } from '@/services/orderService';
import { detectCountryFromLocale, currencyForCountry, taxRateForCountry, formatCurrency } from '@/services/priceUtils';
import { ArrowRight, Trash2, ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CartPage: React.FC = () => {
  const { user } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [totals, setTotals] = useState({ subtotal: 0, discount: 0, total: 0 });
  const [country, setCountry] = useState('US');
  const [currency, setCurrency] = useState('USD');
  const [coupon, setCoupon] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = async () => {
    try {
      const c = await getCart();
      setCart(c);
      const tot = await calculateCartTotal();
      setTotals(tot);
      const detected = detectCountryFromLocale();
      setCountry(detected);
      setCurrency(currencyForCountry(detected));
    } catch (e) {
      toast.error('Failed to load cart');
    }
  };

  const handleRemove = async (itemId: string) => {
    try {
      await removeFromCart(itemId);
      await loadCart();
      toast.success('Removed');
    } catch (e) {
      toast.error('Failed to remove');
    }
  };

  const handleQuantityChange = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    try {
      await updateCartItemQuantity(itemId, newQuantity);
      await loadCart();
    } catch (e) {
      toast.error('Failed to update quantity');
    }
  };

  const handleCheckout = async () => {
    if (!user) return toast.error('Login required');
    if (!cart || cart.items.length === 0) return toast.error('Cart is empty');
    setLoading(true);
    try {
      const result = await createOrderFromCart(user.id);
      if (result.success) {
        toast.success('Order created successfully!');
        navigate('/orders');
      } else {
        toast.error(result.error || 'Order creation failed');
      }
    } catch (e) {
      toast.error('Order creation failed');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <DashboardLayout>
        <Card className="text-center py-16">
          <ShoppingCart className="mx-auto mb-4 text-gray-400" size={48} />
          <p className="text-gray-500 mb-4">Please sign in to view your cart</p>
        </Card>
      </DashboardLayout>
    );
  }

  const items = cart?.items || [];

  if (items.length === 0) {
    return (
      <DashboardLayout>
        <Card className="text-center py-16">
          <ShoppingCart className="mx-auto mb-4 text-gray-400" size={48} />
          <p className="text-gray-500 mb-4">Your cart is empty</p>
          <Button onClick={() => navigate('/billing')}>Browse Plans</Button>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Shopping Cart</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item: CartItem) => (
                <div key={item.id} className="flex items-center justify-between p-4 border rounded">
                  <div>
                    <p className="font-semibold">{item.serviceName}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.billingCycle}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Button variant="outline" size="sm" onClick={() => handleQuantityChange(item.id, item.quantity - 1)} disabled={item.quantity <= 1}>-</Button>
                      <span className="text-sm">Qty: {item.quantity}</span>
                      <Button variant="outline" size="sm" onClick={() => handleQuantityChange(item.id, item.quantity + 1)}>+</Button>
                    </div>
                    <p className="text-sm font-medium">₹{item.unitPrice}/{item.billingCycle}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">₹{item.totalPrice}</span>
                    <Button variant="ghost" onClick={() => handleRemove(item.id)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(totals.subtotal, currency)}</span></div>
              {totals.discount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-{formatCurrency(totals.discount, currency)}</span></div>}
              <div className="flex justify-between"><span>Tax ({(taxRateForCountry(country)*100).toFixed(0)}%)</span><span>{formatCurrency(totals.subtotal * taxRateForCountry(country), currency)}</span></div>
              <div className="border-t pt-4 flex justify-between font-bold"><span>Total</span><span>{formatCurrency(totals.total + totals.subtotal * taxRateForCountry(country), currency)}</span></div>

              <div className="mt-4">
                <Input placeholder="Coupon code" value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} />
                <Button className="w-full mt-3" onClick={handleCheckout} disabled={loading}>{loading ? 'Processing...' : 'Proceed to Checkout'} <ArrowRight className="ml-2 w-4 h-4"/></Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CartPage;