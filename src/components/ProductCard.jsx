import React, { useState } from 'react';
import { Cpu, Monitor, HardDrive, Zap, Box, Thermometer, Database, MemoryStick, Check, ShoppingCart, Heart } from 'lucide-react';
import './ProductCard.css';

export default function ProductCard({ 
  product, 
  category, 
  onSelect, 
  isSelected, 
  onAddToCart,
  onToggleWishlist,
  isInCart = false,
  isInWishlist = false
}) {
  const [toastMsg, setToastMsg] = useState(null);

  const triggerToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2200);
  };

  const getCategoryBadge = () => {
    switch (category) {
      case 'cpu': return { label: 'Processor', icon: <Cpu size={14} /> };
      case 'gpu': return { label: 'Qrafik Kart', icon: <Monitor size={14} /> };
      case 'motherboard': return { label: 'Ana Plata', icon: <Database size={14} /> };
      case 'ram': return { label: 'Operativ Yaddaş', icon: <MemoryStick size={14} /> };
      case 'storage': return { label: 'Yaddaş SSD/HDD', icon: <HardDrive size={14} /> };
      case 'psu': return { label: 'Qida Bloku', icon: <Zap size={14} /> };
      case 'case': return { label: 'Korpus', icon: <Box size={14} /> };
      case 'cooler': return { label: 'Soyuducu', icon: <Thermometer size={14} /> };
      default: return { label: 'Hissə', icon: <Cpu size={14} /> };
    }
  };

  const badge = getCategoryBadge();

  return (
    <div 
      className={`product-card ${isSelected ? 'selected' : ''}`}
      onClick={() => onSelect && onSelect(product)}
      style={{ cursor: onSelect ? 'pointer' : 'default' }}
    >
      {/* Toast Notification */}
      {toastMsg && (
        <div className="card-toast-alert">
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Hover Action Overlay Icons (Cart & Wishlist) */}
      <div className="card-hover-actions">
        {/* Wishlist Toggle Button */}
        <button 
          className={`hover-action-btn wishlist ${isInWishlist ? 'active' : ''}`}
          title={isInWishlist ? "İstək siyahısından çıxar" : "İstək siyahısına əlavə et"}
          onClick={(e) => {
            e.stopPropagation();
            if (onToggleWishlist) {
              onToggleWishlist(product);
              triggerToast(isInWishlist ? "İstək siyahısından silindi" : "İstək siyahısına əlavə olundu");
            }
          }}
        >
          <Heart size={16} fill={isInWishlist ? "#ec4899" : "none"} stroke={isInWishlist ? "#ec4899" : "currentColor"} />
        </button>

        {/* Cart Quick Add Button */}
        {onAddToCart && (
          <button 
            className={`hover-action-btn cart ${isInCart ? 'active' : ''}`}
            title={isInCart ? "Səbətdə var (sayı artırın)" : "Səbətə əlavə et"}
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart(product);
              triggerToast("Məhsul səbətə əlavə olundu 🛒");
            }}
          >
            <ShoppingCart size={16} fill={isInCart ? "var(--accent-cyan)" : "none"} stroke={isInCart ? "#000" : "currentColor"} />
          </button>
        )}
      </div>

      <div className="card-image-container">
        <img src={product.image} alt={product.name} loading="lazy" />
        <span className="brand-tag">{product.brand}</span>
        <div className="category-badge">
          {badge.icon}
          <span>{badge.label}</span>
        </div>
      </div>

      <div className="card-body">
        <h3 className="product-title">{product.name}</h3>

        <div className="specs-list">
          {Object.entries(product.specs || {}).map(([key, val]) => (
            <div key={key} className="spec-item">
              <span className="spec-key">{key}:</span>
              <span className="spec-val">{val}</span>
            </div>
          ))}
        </div>

        <div className="card-footer">
          <div className="price-tag">
            <span className="price-amount">{product.price}</span>
            <span className="price-currency">AZN</span>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            <button 
              className={`select-btn ${isSelected ? 'selected' : ''}`} 
              onClick={(e) => {
                e.stopPropagation();
                if (onSelect) onSelect(product);
              }}
            >
              {isSelected ? (
                <>
                  <Check size={16} />
                  <span>Seçildi</span>
                </>
              ) : (
                <span>Seç</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
