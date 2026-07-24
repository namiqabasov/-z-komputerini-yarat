import React from 'react';
import { Cpu, ShoppingBag, Wrench, User, ShieldCheck, Loader2 } from 'lucide-react';
import './Header.css';

export default function Header({ activeTab, setActiveTab, session, isAdminSession, authLoading }) {
  return (
    <header className="app-header">
      <div className="header-container">
        <div className="logo-section" onClick={() => setActiveTab('home')}>
          <div className="logo-icon-wrapper">
            <Cpu className="logo-icon" size={28} />
          </div>
          <div className="logo-text">
            <span className="brand-title">Öz Kompüterini <span className="highlight">Yığ</span></span>
            <span className="brand-sub">PC Builder & Catalog</span>
          </div>
        </div>

        <nav className="nav-menu">
          <button 
            className={`nav-btn ${activeTab === 'home' ? 'active' : ''}`}
            onClick={() => setActiveTab('home')}
          >
            <ShoppingBag size={18} />
            <span>Kataloq</span>
          </button>
          <button 
            className={`nav-btn ${activeTab === 'builder' ? 'active' : ''}`}
            onClick={() => setActiveTab('builder')}
          >
            <Wrench size={18} />
            <span>PC Builder</span>
          </button>

          {/* User Account / Auth Button with Loading Guard */}
          <button 
            className={`nav-btn ${activeTab === 'profile' || activeTab === 'auth' ? 'active' : ''}`}
            onClick={() => setActiveTab(session ? 'profile' : 'auth')}
            disabled={authLoading}
          >
            <User size={18} />
            <span>
              {authLoading ? '...' : session ? 'Hesabım' : 'Giriş / Qeydiyyat'}
            </span>
          </button>

          {/* Show hidden admin access indicator ONLY IF auth is NOT loading AND user is super-admin */}
          {!authLoading && isAdminSession && (
            <button 
              className={`nav-btn ${activeTab === 'admin-secret' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin-secret')}
              style={{ borderColor: '#ef4444', color: '#ef4444' }}
            >
              <ShieldCheck size={18} />
              <span>Admin Panel</span>
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
