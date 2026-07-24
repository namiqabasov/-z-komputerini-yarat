import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import Catalog from './components/Catalog';
import PcBuilder from './components/PcBuilder';
import UserAuth from './user/UserAuth';
import UserProfile from './user/UserProfile';
import PaymentModal from './user/PaymentModal';
import SecretAdminLogin from './admin/SecretAdminLogin';
import LightAdminDashboard from './admin/LightAdminDashboard';
import { supabase } from './supabaseClient';

function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [session, setSession] = useState(null);
  const [isAdminSession, setIsAdminSession] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const [selectedParts, setSelectedParts] = useState({
    cpu: null,
    motherboard: null,
    gpu: null,
    ram: null,
    storage: null,
    psu: null,
    case: null,
    cooler: null
  });

  const isSecretAdminRoute = activeTab === 'admin-secret' || window.location.pathname === '/admin-panel-gizli-yol';

  useEffect(() => {
    if (window.location.pathname === '/admin-panel-gizli-yol') {
      setActiveTab('admin-secret');
    }
  }, []);

  // Listen to Supabase Auth State with strict loading flag
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      setAuthLoading(true);
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (mounted) {
          setSession(currentSession);
          if (currentSession) {
            await checkAdminRole(currentSession);
          } else {
            setIsAdminSession(false);
          }
        }
      } catch (e) {
        console.error("Auth init error:", e);
      } finally {
        if (mounted) setAuthLoading(false);
      }
    }

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) return;
      setAuthLoading(true);
      setSession(newSession);
      if (newSession) {
        await checkAdminRole(newSession);
      } else {
        setIsAdminSession(false);
      }
      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const checkAdminRole = async (userSession) => {
    if (!userSession) {
      setIsAdminSession(false);
      return;
    }
    try {
      const { data: isAdmin, error } = await supabase.rpc('is_admin');
      if (!error && isAdmin) {
        setIsAdminSession(true);
      } else {
        setIsAdminSession(false);
      }
    } catch (e) {
      setIsAdminSession(false);
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
      // Clear all local & session storage auth tokens
      localStorage.clear();
      sessionStorage.clear();
      setSession(null);
      setIsAdminSession(false);
      setAuthLoading(false);
      setActiveTab('home');
    }
  };

  // IF ADMIN ROUTE (GIZLI ROUTE OR ADMIN DASHBOARD): Render fully isolated layout without public Header and Footer
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

  // PUBLIC SITE LAYOUT (with Header & Footer)
  return (
    <div className="app-layout" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        session={session}
        isAdminSession={isAdminSession}
        authLoading={authLoading}
      />

      <main style={{ flex: 1, maxWidth: '1280px', margin: '0 auto', width: '100%', padding: '2rem 1.5rem' }}>
        {activeTab === 'home' && (
          <Catalog 
            onNavigateToBuilder={() => setActiveTab('builder')}
            selectedParts={selectedParts}
            onSelectPart={handleSelectPartFromCatalog}
          />
        )}

        {activeTab === 'builder' && (
          <PcBuilder 
            selectedParts={selectedParts}
            setSelectedParts={setSelectedParts}
            onOpenCheckout={() => setIsPaymentModalOpen(true)}
          />
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
          <UserAuth onAuthSuccess={() => setActiveTab('profile')} />
        )}
      </main>

      {/* Payment Modal */}
      {isPaymentModalOpen && (
        <PaymentModal 
          session={session}
          selectedParts={selectedParts}
          totalPrice={Object.values(selectedParts).reduce((sum, i) => sum + (i ? i.price : 0), 0)}
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
            setActiveTab('profile');
          }}
        />
      )}

      <Footer />
    </div>
  );
}

export default App;
