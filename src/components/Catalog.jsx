import React, { useState, useEffect } from 'react';
import { Search, Filter, Cpu, Monitor, Database, MemoryStick, HardDrive, Zap, Box, Thermometer, ArrowUpDown } from 'lucide-react';
import ProductCard from './ProductCard';
import './Catalog.css';

const CATEGORIES = [
  { id: 'all', name: 'Bütün Hissələr', icon: <Box size={16} /> },
  { id: 'cpu', name: 'Prosessor (CPU)', icon: <Cpu size={16} /> },
  { id: 'gpu', name: 'Videokart (GPU)', icon: <Monitor size={16} /> },
  { id: 'motherboard', name: 'Ana Plata', icon: <Database size={16} /> },
  { id: 'ram', name: 'RAM (Yaddaş)', icon: <MemoryStick size={16} /> },
  { id: 'storage', name: 'SSD / HDD', icon: <HardDrive size={16} /> },
  { id: 'psu', name: 'Qida Bloku (PSU)', icon: <Zap size={16} /> },
  { id: 'case', name: 'Korpus (Case)', icon: <Box size={16} /> },
  { id: 'cooler', name: 'Soyuducu (Cooler)', icon: <Thermometer size={16} /> }
];

export default function Catalog({ onNavigateToBuilder, selectedParts = {}, onSelectPart }) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [sortBy, setSortBy] = useState('featured');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const catList = ['cpu', 'gpu', 'motherboard', 'ram', 'storage', 'psu', 'case', 'cooler'];
        let loaded = [];

        for (const cat of catList) {
          const res = await fetch(`/data/${cat}.json`);
          if (res.ok) {
            const items = await res.json();
            const tagged = items.map(item => ({ ...item, category: cat }));
            loaded = [...loaded, ...tagged];
          }
        }
        setProducts(loaded);
      } catch (err) {
        console.error("Xəta baş verdi:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const availableBrands = Array.from(new Set(products.map(p => p.brand))).filter(Boolean);

  const filteredProducts = products.filter(product => {
    const matchesCategory = activeCategory === 'all' || product.category === activeCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          product.brand.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBrand = selectedBrand === 'all' || product.brand.toLowerCase() === selectedBrand.toLowerCase();

    return matchesCategory && matchesSearch && matchesBrand;
  }).sort((a, b) => {
    if (sortBy === 'price-asc') return a.price - b.price;
    if (sortBy === 'price-desc') return b.price - a.price;
    if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
    return 0;
  });

  return (
    <div className="catalog-container">
      {/* Hero Banner */}
      <div className="hero-banner">
        <div className="hero-content">
          <h1>Müasir Kompüter Hissələri Kataloqu</h1>
          <p>Azərbaycan bazarındakı real qiymətlərlə ən son prosessorlar, videokartlar və digər komponentlər.</p>
          <button className="hero-cta-btn" onClick={onNavigateToBuilder}>
            Öz PC-ni Yığmağa Başla
          </button>
        </div>
      </div>

      {/* Control Bar: Categories & Search */}
      <div className="catalog-controls">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="Hissə və ya marka axtar (məs: RTX 4060, Ryzen, Samsung)..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <div className="select-wrapper">
            <Filter size={16} />
            <select value={selectedBrand} onChange={(e) => setSelectedBrand(e.target.value)}>
              <option value="all">Bütün Markalar</option>
              {availableBrands.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <div className="select-wrapper">
            <ArrowUpDown size={16} />
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="featured">Seçilmişlər</option>
              <option value="price-asc">Qiymət: Ucuzdan Baha</option>
              <option value="price-desc">Qiymət: Bahadan Ucuza</option>
              <option value="name-asc">Ad: A-Z</option>
            </select>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="category-tabs">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            className={`cat-tab ${activeCategory === cat.id ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat.id)}
          >
            {cat.icon}
            <span>{cat.name}</span>
          </button>
        ))}
      </div>

      {/* Product Grid */}
      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Məhsullar yüklənir...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="empty-state">
          <h3>Məhsul tapılmadı</h3>
          <p>Axtarış sorğusunu və ya süzgəcləri dəyişdirərək yenidən cəhd edin.</p>
        </div>
      ) : (
        <div className="product-grid">
          {filteredProducts.map(product => {
            const isSelected = selectedParts[product.category]?.id === product.id;
            return (
              <ProductCard 
                key={product.id} 
                product={product} 
                category={product.category}
                isSelected={isSelected}
                onSelect={onSelectPart}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
