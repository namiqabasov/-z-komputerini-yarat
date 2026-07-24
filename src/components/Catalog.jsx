import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Search, Filter, Cpu, Monitor, Database, MemoryStick, HardDrive, Zap, Box, Thermometer, ArrowUpDown, ChevronDown } from 'lucide-react';
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

const PAGE_SIZE = 15;

export default function Catalog({ onNavigateToBuilder, selectedParts = {}, onSelectPart }) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [sortBy, setSortBy] = useState('featured');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Fetch initial products or on filter change
  useEffect(() => {
    async function loadInitialProducts() {
      setLoading(true);
      setPage(0);
      setHasMore(true);

      try {
        let query = supabase
          .from('products')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .range(0, PAGE_SIZE - 1);

        if (activeCategory !== 'all') {
          query = query.eq('category', activeCategory);
        }

        const { data, error } = await query;

        if (!error && data) {
          setProducts(data);
          if (data.length < PAGE_SIZE) {
            setHasMore(false);
          }
        } else {
          // Fallback to static JSON if Supabase table empty or error
          const catList = activeCategory === 'all' 
            ? ['cpu', 'gpu', 'motherboard', 'ram', 'storage', 'psu', 'case', 'cooler']
            : [activeCategory];
          let loaded = [];

          for (const cat of catList) {
            const res = await fetch(`/data/${cat}.json`);
            if (res.ok) {
              const items = await res.json();
              const tagged = items.map(item => ({ ...item, category: cat }));
              loaded = [...loaded, ...tagged];
            }
          }
          setProducts(loaded.slice(0, PAGE_SIZE));
          setHasMore(loaded.length > PAGE_SIZE);
        }
      } catch (err) {
        console.error("Supabase data load error:", err);
      } finally {
        setLoading(false);
      }
    }

    loadInitialProducts();
  }, [activeCategory]);

  // Load more 15 items on button click
  const handleLoadMore = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);

    const nextPage = page + 1;
    const from = nextPage * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    try {
      let query = supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (activeCategory !== 'all') {
        query = query.eq('category', activeCategory);
      }

      const { data, error } = await query;

      if (!error && data) {
        if (data.length === 0) {
          setHasMore(false);
        } else {
          setProducts(prev => [...prev, ...data]);
          setPage(nextPage);
          if (data.length < PAGE_SIZE) {
            setHasMore(false);
          }
        }
      }
    } catch (err) {
      console.error("Load more error:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  const availableBrands = Array.from(new Set(products.map(p => p.brand))).filter(Boolean);

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          product.brand.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBrand = selectedBrand === 'all' || product.brand.toLowerCase() === selectedBrand.toLowerCase();

    return matchesSearch && matchesBrand;
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

      {/* Control Bar */}
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
        <>
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

          {/* Load More Button */}
          {hasMore && (
            <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
              <button 
                onClick={handleLoadMore} 
                disabled={loadingMore}
                style={{
                  background: 'rgba(0, 240, 255, 0.1)',
                  border: '1px solid var(--accent-cyan)',
                  color: 'var(--accent-cyan)',
                  padding: '0.85rem 2.5rem',
                  borderRadius: '10px',
                  fontSize: '0.95rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: 'var(--glow-cyan)',
                  transition: 'all 0.25s ease'
                }}
              >
                <ChevronDown size={18} />
                <span>{loadingMore ? 'Yüklənir...' : 'Daha çox göstər'}</span>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
