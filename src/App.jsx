import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import Catalog from './components/Catalog';
import PcBuilder from './components/PcBuilder';
import CartPage from './user/CartPage';
import WishlistPage from './user/WishlistPage';
import ContactPage from './components/ContactPage';
import UserAuth from './user/UserAuth';
import UserProfile from './user/UserProfile';
import PaymentModal from './user/PaymentModal';
import SecretAdminLogin from './admin/SecretAdminLogin';
import LightAdminDashboard from './admin/LightAdminDashboard';
import LiveChatWidget from './components/LiveChatWidget';
import { supabase } from './supabaseClient';

// Map URL paths to activeTab values
const PATH_TO_TAB = {
  '/': 'home',
  '/builder': 'builder',
  '/cart': 'cart',
  '/wishlist': 'wishlist',
  '/contact': 'contact',
  '/profile': 'profile',
  '/auth': 'auth',
  '/admin-panel-gizli-yol': 'admin-secret'
};

const TAB_TO_PATH = {
  'home': '/',
  'builder': '/builder',
  'cart': '/cart',
  'wishlist': '/wishlist',
  'contact': '/contact',
  'profile': '/profile',
  'auth': '/auth',
  'admin-secret': '/admin-panel-gizli-yol'
};

function App() {
  // Determine initial activeTab from window.location.pathname on load
  const [activeTab, setActiveTabState] = useState(() => {
    const path = window.location.pathname;
    return PATH_TO_TAB[path] || 'home';
  });

  const [session, setSession] = useState(null);
  const [isAdminSession, setIsAdminSession] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [checkoutCartData, setCheckoutCartData] = useState({ cartItems: [], totalPrice: 0 });

  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);

  const [selectedParts, setSelectedParts] = useState({
    cpu: null, motherboard: null, gpu: null, ram: null,
    storage: null, psu: null, case: null, cooler: null
  });

  // Custom tab setter that updates URL path synchronously
  const setActiveTab = (newTab) => {
    setActiveTabState(newTab);
    const targetPath = TAB_TO_PATH[newTab] || '/';
    if (window.location.pathname !== targetPath) {
      window.history.pushState({}, '', targetPath);
    }
  };

  // Sync activeTab if user uses browser Back / Forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      setActiveTabState(PATH_TO_TAB[path] || 'home');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Handle return from online payment gateway (e.g. Payriff return URL)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment_status');
    const orderId = urlParams.get('order_id');

    if (paymentStatus && orderId) {
      if (paymentStatus === 'success') {
        // Trigger status update call to webhook or RPC for simulated sandbox mode
        supabase
          .from('orders')
          .update({ status: 'approved', payriff_transaction_id: `SIM_${Date.now()}` })
          .eq('id', orderId)
          .then(({ error }) => {
            if (!error) {
              alert(`🎉 Ödənişiniz uğurla tamamlandı! Sifariş #${orderId.substring(0, 8)} təsdiqləndi.`);
            }
          });
      } else if (paymentStatus === 'canceled' || paymentStatus === 'declined') {
        alert(`❌ Ödəniş tamamlanmadı və ya ləğv edildi. Lütfən təkrar cəhd edin.`);
      }
      
      // Clean query params from URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const isSecretAdminRoute = activeTab === 'admin-secret' || window.location.pathname === '/admin-panel-gizli-yol';

  // Fetch counts for Header badges (Cart count = number of DISTINCT product types/rows)
  const fetchHeaderCounts = async (currSession) => {
    if (currSession?.user?.id) {
      // Cart distinct items count (number of unique rows)
      const { count: cartDistinctCount } = await supabase
        .from('cart_items')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', currSession.user.id);
      
      setCartCount(cartDistinctCount || 0);

      // Wishlist count
      const { count: wishCount } = await supabase.from('wishlist').select('*', { count: 'exact', head: true }).eq('user_id', currSession.user.id);
      setWishlistCount(wishCount || 0);
    } else {
      setCartCount(0);
      // Localstorage guest wishlist count
      try {
        const guestWish = JSON.parse(localStorage.getItem('guest_wishlist') || '[]');
        setWishlistCount(guestWish.length);
      } catch (e) {
        setWishlistCount(0);
      }
    }
  };

  // Listen to Supabase Auth State
  useEffect(() => {
    let mounted = true;

    async function evaluateSession(targetSession) {
      if (!targetSession) {
        if (mounted) {
          setSession(null);
          setIsAdminSession(false);
          setAuthLoading(false);
          fetchHeaderCounts(null);
        }
        return;
      }

      try {
        const { data: isAdmin } = await supabase.rpc('is_admin');
        if (mounted) {
          setIsAdminSession(!!isAdmin);
          setSession(targetSession);
          fetchHeaderCounts(targetSession);
          try {
            fetchWishlistIds(targetSession);
          } catch (e) {}
        }
      } catch (e) {
        if (mounted) {
          setIsAdminSession(false);
          setSession(targetSession);
          fetchHeaderCounts(targetSession);
        }
      } finally {
        if (mounted) setAuthLoading(false);
      }
    }

    async function initAuth() {
      setAuthLoading(true);
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        await evaluateSession(currentSession);
      } catch (e) {
        if (mounted) setAuthLoading(false);
      }
    }

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) return;
      setAuthLoading(true);
      await evaluateSession(newSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Add single product or PC build to cart (increment quantity if already exists)
  const handleAddToCart = async (item, itemType = 'single_part') => {
    if (!session) {
      setActiveTab('auth');
      return;
    }

    try {
      const userId = session.user.id;
      const targetId = item.id || JSON.stringify(item.parts || {});

      // 1. Fetch user's current cart items to check if item already exists
      const { data: existingItems, error: fetchErr } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', userId)
        .eq('item_type', itemType);

      if (fetchErr) throw fetchErr;

      // Find matching item
      const match = (existingItems || []).find(cartItem => {
        if (itemType === 'single_part') {
          return cartItem.item_data?.id === targetId;
        } else {
          return JSON.stringify(cartItem.item_data?.parts || {}) === JSON.stringify(item.parts || {});
        }
      });

      if (match) {
        // UPDATE: Increment quantity
        const { error: updateErr } = await supabase
          .from('cart_items')
          .update({ quantity: (match.quantity || 1) + 1 })
          .eq('id', match.id);

        if (updateErr) throw updateErr;
      } else {
        // INSERT: Create new row with quantity = 1
        const payload = {
          user_id: userId,
          item_type: itemType,
          item_data: item,
          price: item.price || Object.values(item.parts || {}).reduce((s, p) => s + (p ? p.price : 0), 0),
          quantity: 1
        };

        const { error: insertErr } = await supabase.from('cart_items').insert([payload]);
        if (insertErr) throw insertErr;
      }

      fetchHeaderCounts(session);
    } catch (err) {
      console.error("Cart error:", err);
      alert("Səbətə əlavə etmə xətası: " + err.message);
    }
  };

  const handleSelectPartFromCatalog = (product) => {
    if (!product || !product.category) return;
    setSelectedParts(prev => ({
      ...prev,
      [product.category]: product
    }));
    setActiveTab('builder');
  };

  const [wishlistIds, setWishlistIds] = useState([]);

  // Fetch wishlist IDs for visual heart toggle state
  const fetchWishlistIds = async (currSession) => {
    if (currSession?.user?.id) {
      const { data } = await supabase.from('wishlist').select('product_id').eq('user_id', currSession.user.id);
      setWishlistIds((data || []).map(i => i.product_id));
    } else {
      try {
        const guestWish = JSON.parse(localStorage.getItem('guest_wishlist') || '[]');
        setWishlistIds(guestWish.map(i => i.id));
      } catch (e) {
        setWishlistIds([]);
      }
    }
  };

  // Toggle wishlist (add/remove) for any product card
  const handleToggleWishlist = async (product) => {
    if (!product || !product.id) return;
    const productId = product.id;
    const exists = wishlistIds.includes(productId);

    if (session?.user?.id) {
      if (exists) {
        await supabase.from('wishlist').delete().eq('user_id', session.user.id).eq('product_id', productId);
        setWishlistIds(prev => prev.filter(id => id !== productId));
      } else {
        await supabase.from('wishlist').insert([{ user_id: session.user.id, product_id: productId, product_data: product }]);
        setWishlistIds(prev => [...prev, productId]);
      }
    } else {
      let guestWish = [];
      try {
        guestWish = JSON.parse(localStorage.getItem('guest_wishlist') || '[]');
      } catch (e) {}

      if (exists) {
        guestWish = guestWish.filter(p => p.id !== productId);
        setWishlistIds(prev => prev.filter(id => id !== productId));
      } else {
        guestWish.push(product);
        setWishlistIds(prev => [...prev, productId]);
      }
      localStorage.setItem('guest_wishlist', JSON.stringify(guestWish));
    }
    fetchHeaderCounts(session);
  };

  const handleLogout = async () => {
    setAuthLoading(true);
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Logout error:", e);
    } finally {
      localStorage.clear();
      sessionStorage.clear();
      setSession(null);
      setIsAdminSession(false);
      setAuthLoading(false);
      setCartCount(0);
      setWishlistCount(0);
      setActiveTab('home');
    }
  };

  // IF ADMIN ROUTE: Render standalone admin layout
  if (isSecretAdminRoute) {
    if (authLoading) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: '#38bdf8' }}>
          <p style={{ fontSize: '1.1rem', fontWeight: '600' }}>Təhlükəsiz Giriş Yoxlanılır...</p>
        </div>
      );
    }

    if (!isAdminSession) {
      return (
        <SecretAdminLogin 
          onAdminLoginSuccess={(sess) => {
            setSession(sess);
            setIsAdminSession(true);
            setActiveTab('admin-secret');
          }} 
        />
      );
    }

    return (
      <div className="admin-standalone-wrapper" style={{ minHeight: '100vh', background: '#f8fafc', padding: '1.5rem' }}>
        <LightAdminDashboard session={session} onLogout={handleLogout} />
      </div>
    );
  }

  // PUBLIC SITE LAYOUT
  return (
    <div className="app-layout" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        session={session}
        authLoading={authLoading}
        cartCount={cartCount}
        wishlistCount={wishlistCount}
      />

      <main style={{ flex: 1, maxWidth: '1280px', margin: '0 auto', width: '100%', padding: '2rem 1.5rem' }}>
        {activeTab === 'home' && (
          <Catalog 
            onNavigateToBuilder={() => setActiveTab('builder')}
            selectedParts={selectedParts}
            onSelectPart={handleSelectPartFromCatalog}
            onAddToCart={(prod) => handleAddToCart(prod, 'single_part')}
            wishlistIds={wishlistIds}
            onToggleWishlist={handleToggleWishlist}
          />
        )}

        {activeTab === 'builder' && (
          <PcBuilder 
            selectedParts={selectedParts}
            setSelectedParts={setSelectedParts}
            onOpenCheckout={() => {
              setCheckoutCartData({
                cartItems: [],
                totalPrice: Object.values(selectedParts).reduce((sum, i) => sum + (i ? i.price : 0), 0)
              });
              setIsPaymentModalOpen(true);
            }}
            onAddBuildToCart={(buildData) => handleAddToCart(buildData, 'pc_build')}
          />
        )}

        {activeTab === 'cart' && (
          <CartPage 
            session={session} 
            onRequireLogin={() => setActiveTab('auth')} 
            onOpenCheckout={(items, total) => {
              setCheckoutCartData({ cartItems: items, totalPrice: total });
              setIsPaymentModalOpen(true);
            }}
          />
        )}

        {activeTab === 'wishlist' && (
          <WishlistPage 
            session={session} 
            onAddToCart={(prod) => handleAddToCart(prod, 'single_part')}
            onNavigateToCatalog={() => setActiveTab('home')}
            onToggleWishlist={handleToggleWishlist}
          />
        )}

        {activeTab === 'contact' && (
          <ContactPage />
        )}

        {activeTab === 'profile' && (
          authLoading ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>Hesab məlumatları yüklənir...</div>
          ) : session ? (
            <UserProfile session={session} onLogout={handleLogout} />
          ) : (
            <UserAuth onAuthSuccess={() => setActiveTab('profile')} />
          )
        )}

        {activeTab === 'auth' && (
          <UserAuth onAuthSuccess={() => {
            fetchHeaderCounts(session);
            setActiveTab('profile');
          }} />
        )}
      </main>

      {/* Payment Modal */}
      {isPaymentModalOpen && (
        <PaymentModal 
          session={session}
          cartItems={checkoutCartData.cartItems}
          selectedParts={selectedParts}
          totalPrice={checkoutCartData.totalPrice}
          onClose={() => setIsPaymentModalOpen(false)}
          onRequireLogin={() => {
            setIsPaymentModalOpen(false);
            setActiveTab('auth');
          }}
          onSuccess={() => {
            setSelectedParts({
              cpu: null, motherboard: null, gpu: null, ram: null,
              storage: null, psu: null, case: null, cooler: null
            });
            fetchHeaderCounts(session);
            setActiveTab('profile');
          }}
        />
      )}

      {/* Live Chat Widget for public pages */}
      <LiveChatWidget session={session} onRequireLogin={() => setActiveTab('auth')} />

      <Footer />
    </div>
  );
}

export default App;
