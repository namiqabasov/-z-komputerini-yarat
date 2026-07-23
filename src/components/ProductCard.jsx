import React from 'react';
import { Cpu, Monitor, HardDrive, Zap, Box, Thermometer, Database, MemoryStick, Check } from 'lucide-react';
import './ProductCard.css';

export default function ProductCard({ product, category, onSelect, isSelected }) {
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
  );
}
