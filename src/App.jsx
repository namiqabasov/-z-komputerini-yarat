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

  // Listen to Supabase Auth State
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      checkAdminRole(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      checkAdminRole(session);
    });

    return () => subscription.unsubscribe();
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
    await supabase.auth.signOut();
    setSession(null);
    setIsAdminSession(false);
    setActiveTab('home');
  };

  // IF ADMIN ROUTE (GIZLI ROUTE OR ADMIN DASHBOARD): Render fully isolated layout without public Header and Footer
  if (isSecretAdminRoute) {
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
          session ? (
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
