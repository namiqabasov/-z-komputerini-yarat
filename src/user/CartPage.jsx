import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { ShoppingBag, Trash2, Plus, Minus, ArrowRight, Box, Cpu, AlertCircle } from 'lucide-react';
import './CartPage.css';

export default function CartPage({ session, onRequireLogin, onOpenCheckout }) {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCart = async () => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCartItems(data || []);
    } catch (err) {
      console.error("Cart fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, [session]);

  const handleUpdateQuantity = async (itemId, currentQty, delta) => {
    const newQty = currentQty + delta;
    if (newQty < 1) return;

    try {
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity: newQty })
        .eq('id', itemId);

      if (error) throw error;
      setCartItems(prev => prev.map(item => item.id === itemId ? { ...item, quantity: newQty } : item));
    } catch (err) {
      alert("Xəta: " + err.message);
    }
  };

  const handleRemoveItem = async (itemId) => {
    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      setCartItems(prev => prev.filter(item => item.id !== itemId));
    } catch (err) {
      alert("Silinmə xətası: " + err.message);
    }
  };

  const totalPrice = cartItems.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);

  if (!session) {
    return (
      <div className="cart-page-container empty">
        <div className="cart-notice-box">
          <AlertCircle size={48} className="notice-icon" />
          <h3>Səbətinizə Baxmaq Üçün Daxil Olun</h3>
          <p>Səbətdəki məhsulları saxlamaq və sifariş etmək üçün hesabınıza giriş edin.</p>
          <button className="cart-login-btn" onClick={onRequireLogin}>
            Giriş Et / Qeydiyyat
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page-container">
      <div className="cart-header">
        <h2><ShoppingBag size={24} /> Səbətim ({cartItems.length})</h2>
        <p>Əlavə etdiyiniz hazır PC konfiqurasiyaları və fərdi kompüter hissələri.</p>
      </div>

      {loading ? (
        <div className="cart-loading">
          <div className="spinner"></div>
          <p>Səbətiniz yüklənir...</p>
        </div>
      ) : cartItems.length === 0 ? (
        <div className="cart-empty-box">
          <Box size={54} />
          <h3>Səbətiniz Hal-hazırda Boşdur</h3>
          <p>Kataloqdan hissələr və ya PC Builder-dən hazır kompyuter yığaraq səbətə əlavə edin.</p>
        </div>
      ) : (
        <div className="cart-layout">
          {/* Cart Items List */}
          <div className="cart-items-list">
            {cartItems.map(item => {
              const isPcBuild = item.item_type === 'pc_build';
              const itemData = item.item_data || {};

              return (
                <div key={item.id} className="cart-item-card">
                  <div className="cart-item-img">
                    {isPcBuild ? (
                      <div className="pc-build-icon-badge">
                        <Cpu size={28} />
                      </div>
                    ) : (
                      <img src={itemData.image} alt={itemData.name} />
                    )}
                  </div>

                  <div className="cart-item-info">
                    <div className="cart-item-title-row">
                      <h4>{isPcBuild ? itemData.build_name || 'Özəl Yığılmış PC' : itemData.name}</h4>
                      <span className={`cart-type-badge ${item.item_type}`}>
                        {isPcBuild ? 'Hazır PC Paket' : 'Hissə'}
                      </span>
                    </div>

                    {isPcBuild ? (
                      <div className="cart-build-parts-summary">
                        {Object.entries(itemData.parts || {}).map(([cat, part]) => part && (
                          <span key={cat} className="part-mini-tag">
                            <strong>{cat.toUpperCase()}:</strong> {part.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="cart-item-brand">Brend: {itemData.brand}</span>
                    )}

                    <div className="cart-item-price-unit">
                      Birim Qiyməti: <strong>{item.price} AZN</strong>
                    </div>
                  </div>

                  <div className="cart-item-controls">
                    <div className="quantity-counter">
                      <button onClick={() => handleUpdateQuantity(item.id, item.quantity, -1)} disabled={item.quantity <= 1}>
                        <Minus size={14} />
                      </button>
                      <span>{item.quantity}</span>
                      <button onClick={() => handleUpdateQuantity(item.id, item.quantity, 1)}>
                        <Plus size={14} />
                      </button>
                    </div>

                    <div className="cart-item-subtotal">
                      {(Number(item.price) * item.quantity).toFixed(0)} AZN
                    </div>

                    <button className="cart-remove-btn" title="Sil" onClick={() => handleRemoveItem(item.id)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Cart Summary Card */}
          <div className="cart-summary-sidebar">
            <div className="summary-card">
              <h3>Sifariş Xülasəsi</h3>
              <div className="summary-row">
                <span>Cəmi Məhsul Sayı:</span>
                <strong>{cartItems.reduce((s, i) => s + i.quantity, 0)} ədəd</strong>
              </div>
              <div className="summary-row total">
                <span>Yekun Məbləğ:</span>
                <span className="total-price-val">{totalPrice.toFixed(0)} AZN</span>
              </div>

              <button className="checkout-btn" onClick={() => onOpenCheckout(cartItems, totalPrice)}>
                Sifariş Et Və Ödəniş <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
