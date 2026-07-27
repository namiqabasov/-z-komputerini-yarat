import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Heart, ShoppingBag, Trash2, Box, AlertCircle } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import './WishlistPage.css';

export default function WishlistPage({ session, onAddToCart, onNavigateToCatalog }) {
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchWishlist = async () => {
    setLoading(true);
    if (session?.user?.id) {
      // Fetch from Supabase for logged-in user
      try {
        const { data, error } = await supabase
          .from('wishlist')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });

        if (!error && data) {
          const validItems = data
            .map(item => item.product_data)
            .filter(prod => prod && typeof prod === 'object' && prod.id);
          setWishlistItems(validItems);
        }
      } catch (err) {
        console.error("Supabase wishlist error:", err);
      }
    } else {
      // Fetch from localStorage for anonymous user
      try {
        const local = JSON.parse(localStorage.getItem('guest_wishlist') || '[]');
        const validLocal = Array.isArray(local) 
          ? local.filter(prod => prod && typeof prod === 'object' && prod.id)
          : [];
        setWishlistItems(validLocal);
      } catch (e) {
        setWishlistItems([]);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchWishlist();
  }, [session]);

  const handleRemoveFromWishlist = async (productId) => {
    if (session?.user?.id) {
      try {
        await supabase
          .from('wishlist')
          .delete()
          .eq('user_id', session.user.id)
          .eq('product_id', productId);
      } catch (e) {
        console.error(e);
      }
    } else {
      const local = JSON.parse(localStorage.getItem('guest_wishlist') || '[]');
      const updated = local.filter(p => p.id !== productId);
      localStorage.setItem('guest_wishlist', JSON.stringify(updated));
    }
    setWishlistItems(prev => prev.filter(p => p.id !== productId));
  };

  return (
    <div className="wishlist-page-container">
      <div className="wishlist-header">
        <h2><Heart size={24} className="heart-title-icon" /> İstək Siyahım ({wishlistItems.length})</h2>
        <p>Bəyəndiyiniz və sonra almaq üçün saxladığınız kompüter hissələri.</p>
      </div>

      {loading ? (
        <div className="wishlist-loading">
          <div className="spinner"></div>
          <p>İstək siyahınız yüklənir...</p>
        </div>
      ) : wishlistItems.length === 0 ? (
        <div className="wishlist-empty-box">
          <Box size={54} />
          <h3>İstək Siyahınız Hal-hazırda Boşdur</h3>
          <p>Kataloqdakı məhsullarda ürək ikonuna sıxaraq bəyəndiyiniz hissələri bura əlavə edə bilərsiniz.</p>
          {onNavigateToCatalog && (
            <button className="wishlist-catalog-btn" onClick={onNavigateToCatalog}>
              Kataloqa Keç
            </button>
          )}
        </div>
      ) : (
        <div className="wishlist-grid">
          {wishlistItems.filter(Boolean).map(product => (
            <div key={product.id || Math.random()} className="wishlist-card-wrapper">
              <ProductCard
                product={product}
                category={product.category}
                onAddToCart={onAddToCart}
                onToggleWishlist={onToggleWishlist || handleRemoveFromWishlist}
                isInWishlist={true}
              />
              <button 
                className="wishlist-remove-btn" 
                onClick={() => (onToggleWishlist ? onToggleWishlist(product) : handleRemoveFromWishlist(product.id))}
                title="İstək siyahısından sil"
              >
                <Trash2 size={16} />
                <span>Siyahıdan Sil</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
