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
import { supabase } from './supabaseClient';

function App() {
  const [activeTab, setActiveTab] = useState('home'); // 'home', 'builder', 'cart', 'wishlist', 'contact', 'profile', 'auth', 'admin-secret'
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

  const isSecretAdminRoute = activeTab === 'admin-secret' || window.location.pathname === '/admin-panel-gizli-yol';

  // Check URL path on load
  useEffect(() => {
    if (window.location.pathname === '/admin-panel-gizli-yol') {
      setActiveTab('admin-secret');
    }
  }, []);

  // Fetch counts for Header badges
  const fetchHeaderCounts = async (currSession) => {
    if (currSession?.user?.id) {
      // Cart count
      const { data: cartData } = await supabase.from('cart_items').select('quantity').eq('user_id', currSession.user.id);
      const totalCartQty = (cartData || []).reduce((sum, item) => sum + (item.quantity || 1), 0);
      setCartCount(totalCartQty);

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

  // Add single product or PC build to cart
  const handleAddToCart = async (item, itemType = 'single_part') => {
    if (!session) {
      setActiveTab('auth');
      return;
    }

    try {
      const payload = {
        user_id: session.user.id,
        item_type: itemType,
        item_data: item,
        price: item.price || Object.values(item.parts || {}).reduce((s, p) => s + (p ? p.price : 0), 0),
        quantity: 1
      };

      const { error } = await supabase.from('cart_items').insert([payload]);
      if (error) throw error;

      alert("Məhsul səbətə əlavə olundu!");
      fetchHeaderCounts(session);
    } catch (err) {
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

      <Footer />
    </div>
  );
}

export default App;
