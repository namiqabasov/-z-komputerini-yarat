import React, { useState } from 'react';
import { Cpu, ShoppingBag, Wrench, User, ShoppingCart, Heart, MessageSquare, Menu, X } from 'lucide-react';
import './Header.css';

export default function Header({ 
  activeTab, 
  setActiveTab, 
  session, 
  authLoading,
  cartCount = 0,
  wishlistCount = 0
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (tab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header className="app-header">
      <div className="header-container">
        <div className="logo-section" onClick={() => handleNavClick('home')}>
          <div className="logo-icon-wrapper">
            <Cpu className="logo-icon" size={28} />
          </div>
          <div className="logo-text">
            <span className="brand-title">Öz Kompüterini <span className="highlight">Yığ</span></span>
            <span className="brand-sub">PC Builder & Catalog</span>
          </div>
        </div>

        {/* Mobile Hamburger Toggle Button */}
        <button 
          className="mobile-menu-toggle" 
          onClick={() => setMobileMenuOpen(prev => !prev)}
          aria-label="Menyu"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        <nav className={`nav-menu ${mobileMenuOpen ? 'open' : ''}`}>
          <button 
            className={`nav-btn ${activeTab === 'home' ? 'active' : ''}`}
            onClick={() => handleNavClick('home')}
          >
            <ShoppingBag size={18} />
            <span>Kataloq</span>
          </button>

          <button 
            className={`nav-btn ${activeTab === 'builder' ? 'active' : ''}`}
            onClick={() => handleNavClick('builder')}
          >
            <Wrench size={18} />
            <span>PC Builder</span>
          </button>

          {/* Cart Button with Count Badge */}
          <button 
            className={`nav-btn ${activeTab === 'cart' ? 'active' : ''}`}
            onClick={() => handleNavClick('cart')}
            style={{ position: 'relative' }}
          >
            <ShoppingCart size={18} />
            <span>Səbət</span>
            {cartCount > 0 && (
              <span className="header-badge cyan">{cartCount}</span>
            )}
          </button>

          {/* Wishlist Button with Count Badge */}
          <button 
            className={`nav-btn ${activeTab === 'wishlist' ? 'active' : ''}`}
            onClick={() => handleNavClick('wishlist')}
            style={{ position: 'relative' }}
          >
            <Heart size={18} />
            <span>İstək Siyahısı</span>
            {wishlistCount > 0 && (
              <span className="header-badge pink">{wishlistCount}</span>
            )}
          </button>

          {/* Contact Us Button */}
          <button 
            className={`nav-btn ${activeTab === 'contact' ? 'active' : ''}`}
            onClick={() => handleNavClick('contact')}
          >
            <MessageSquare size={18} />
            <span>Əlaqə</span>
          </button>

          {/* User Account / Auth Button */}
          <button 
            className={`nav-btn ${activeTab === 'profile' || activeTab === 'auth' ? 'active' : ''}`}
            onClick={() => handleNavClick(session ? 'profile' : 'auth')}
            disabled={authLoading}
          >
            <User size={18} />
            <span>
              {authLoading ? '...' : session ? 'Hesabım' : 'Giriş / Qeydiyyat'}
            </span>
          </button>
        </nav>
      </div>
    </header>
  );
}
