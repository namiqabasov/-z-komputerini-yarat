import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Package, CheckCircle, XCircle, Plus, Search, Filter, 
  LogOut, Edit, Trash2, Layers, Cpu, Monitor, Database, 
  MemoryStick, HardDrive, Zap, Box, Thermometer 
} from 'lucide-react';
import ProductModal from './ProductModal';
import './AdminDashboard.css';

const CATEGORY_NAMES = {
  cpu: 'Prosessor (CPU)',
  gpu: 'Videokart (GPU)',
  motherboard: 'Ana Plata',
  ram: 'RAM',
  storage: 'SSD/HDD',
  psu: 'Qida Bloku',
  case: 'Korpus',
  cooler: 'Soyuducu'
};

export default function AdminDashboard({ session, onLogout }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // Modal states for Create/Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error("Məhsul çəkmə xətası:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Filtered Products
  const filteredProducts = products.filter(p => {
    const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.brand.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // Calculate Statistics
  const totalProducts = products.length;
  const activeProducts = products.filter(p => p.is_active).length;
  const categoryCounts = Object.keys(CATEGORY_NAMES).reduce((acc, cat) => {
    acc[cat] = products.filter(p => p.category === cat).length;
    return acc;
  }, {});

  const handleToggleStatus = async (product) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: !product.is_active })
        .eq('id', product.id);

      if (error) throw error;
      fetchProducts();
    } catch (err) {
      alert("Status dəyişdirilərkən xəta: " + err.message);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm("Bu məhsulu silməyə əminsiniz?")) return;
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchProducts();
    } catch (err) {
      alert("Silinmə xətası: " + err.message);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  return (
    <div className="admin-dashboard-container">
      {/* Top Admin Header */}
      <div className="admin-header">
        <div className="admin-title-group">
          <h2>Admin Dashboard</h2>
          <span className="admin-email-tag">{session?.user?.email}</span>
        </div>
        <button className="logout-btn" onClick={onLogout}>
          <LogOut size={16} />
          <span>Çıxış</span>
        </button>
      </div>

      {/* Stats Overview Grid */}
      <div className="stats-grid">
        <div className="stat-card primary">
          <div className="stat-icon-wrapper">
            <Package size={24} />
          </div>
          <div className="stat-data">
            <span className="stat-title">Cəmi Məhsul Sayı</span>
            <span className="stat-value">{totalProducts}</span>
          </div>
        </div>

        <div className="stat-card success">
          <div className="stat-icon-wrapper">
            <CheckCircle size={24} />
          </div>
          <div className="stat-data">
            <span className="stat-title">Aktiv Satışda</span>
            <span className="stat-value">{activeProducts}</span>
          </div>
        </div>

        <div className="stat-card warning">
          <div className="stat-icon-wrapper">
            <Layers size={24} />
          </div>
          <div className="stat-data">
            <span className="stat-title">Kateqoriyalar</span>
            <span className="stat-value">8 Kateqoriya</span>
          </div>
        </div>
      </div>

      {/* Control Bar: Search, Category Filter, Add New */}
      <div className="admin-controls-bar">
        <div className="admin-search-wrapper">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="Məhsul adı və ya brend axtar..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="admin-filter-group">
          <select 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="category-select"
          >
            <option value="all">Bütün Kateqoriyalar ({totalProducts})</option>
            {Object.entries(CATEGORY_NAMES).map(([key, name]) => (
              <option key={key} value={key}>
                {name} ({categoryCounts[key] || 0})
              </option>
            ))}
          </select>

          <button className="add-product-btn" onClick={handleOpenCreateModal}>
            <Plus size={18} />
            <span>Yeni Məhsul Əlavə Et</span>
          </button>
        </div>
      </div>

      {/* Product Table */}
      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Məhsullar Supabase-dən çəkilir...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="empty-state">
          <h3>Məhsul tapılmadı</h3>
          <p>Seçilən meyarlara uyğun heç bir məhsul mövcud deyil.</p>
        </div>
      ) : (
        <div className="table-responsive-wrapper">
          <table className="products-table">
            <thead>
              <tr>
                <th>Şəkil</th>
                <th>Ad & Brend</th>
                <th>Kateqoriya</th>
                <th>Qiymət</th>
                <th>Stok</th>
                <th>Status</th>
                <th>Əməliyyatlar</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(product => (
                <tr key={product.id} className={!product.is_active ? 'inactive-row' : ''}>
                  <td>
                    <img src={product.image} alt={product.name} className="table-thumb" />
                  </td>
                  <td>
                    <div className="product-cell-name">
                      <span className="p-title">{product.name}</span>
                      <span className="p-brand">{product.brand}</span>
                    </div>
                  </td>
                  <td>
                    <span className="cat-badge">{CATEGORY_NAMES[product.category] || product.category}</span>
                  </td>
                  <td>
                    <span className="price-val">{product.price} AZN</span>
                  </td>
                  <td>
                    <span className="stock-val">{product.stock || 10} ədəd</span>
                  </td>
                  <td>
                    <button 
                      className={`status-toggle-btn ${product.is_active ? 'active' : 'inactive'}`}
                      onClick={() => handleToggleStatus(product)}
                      title="Statusu dəyiş"
                    >
                      {product.is_active ? 'Aktiv' : 'Deaktiv'}
                    </button>
                  </td>
                  <td>
                    <div className="table-actions">
                      <button 
                        className="action-icon-btn edit" 
                        title="Redaktə et"
                        onClick={() => handleOpenEditModal(product)}
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        className="action-icon-btn delete" 
                        title="Sil"
                        onClick={() => handleDeleteProduct(product.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal (Implemented in next step) */}
      {isModalOpen && (
        <ProductModal 
          editingProduct={editingProduct} 
          onClose={() => setIsModalOpen(false)} 
          onRefresh={fetchProducts} 
        />
      )}
    </div>
  );
}
