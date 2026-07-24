import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  ShoppingBag, Users, Package, CheckCircle, XCircle, 
  Clock, Eye, LogOut, Search, Filter, RefreshCw, FileText,
  BarChart2, TrendingUp, PieChart as PieIcon, Activity
} from 'lucide-react';
import { 
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import ProductModal from './ProductModal';
import './LightAdminDashboard.css';

const CATEGORY_NAMES = {
  cpu: 'CPU',
  gpu: 'GPU',
  motherboard: 'Ana Plata',
  ram: 'RAM',
  storage: 'SSD/HDD',
  psu: 'PSU',
  case: 'Korpus',
  cooler: 'Soyuducu'
};

const PIE_COLORS = ['#2563eb', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

export default function LightAdminDashboard({ session, onLogout }) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'orders', 'products', 'users'
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal for view receipt image
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  // Modal for Create/Edit Products
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      // Fetch Orders
      const { data: ordData } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      setOrders(ordData || []);

      // Fetch Products
      const { data: prodData } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      setProducts(prodData || []);

      // Fetch Users
      const { data: userData } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      setUsersList(userData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Update order status
  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;
      fetchAllData();
    } catch (err) {
      alert("Status yenilənmə xətası: " + err.message);
    }
  };

  // Delete product with confirmation
  const handleDeleteProduct = async (productId, productName) => {
    if (!window.confirm(`"${productName}" məhsulunu silmək istədiyinizə əminsiniz?`)) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;

      setProducts(prev => prev.filter(p => p.id !== productId));
    } catch (err) {
      alert("Silinmə xətası: " + err.message);
    }
  };

  // Delete receipt file from Storage and reset receipt_url in orders table
  const handleDeleteReceipt = async (orderId, receiptUrl) => {
    if (!window.confirm("Bu ödəniş çekini silmək istədiyinizə əminsiniz?")) return;

    try {
      if (receiptUrl) {
        const urlParts = receiptUrl.split('/receipts/');
        if (urlParts.length > 1) {
          const filePath = urlParts[1];
          await supabase.storage.from('receipts').remove([filePath]);
        }
      }

      const { error } = await supabase
        .from('orders')
        .update({ receipt_url: null })
        .eq('id', orderId);

      if (error) throw error;

      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, receipt_url: null } : o));
      alert("Ödəniş çeki silindi.");
    } catch (err) {
      alert("Çek silinmə xətası: " + err.message);
    }
  };

  // Statistics Calculations
  const pendingOrdersCount = orders.filter(o => o.status === 'pending').length;
  const totalRevenue = orders.filter(o => o.status === 'approved').reduce((sum, o) => sum + (o.total_price || 0), 0);

  // Prepare Last 7 Days Orders Chart Data
  const getLast7DaysData = () => {
    const daysMap = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('az-AZ', { month: 'short', day: 'numeric' });
      daysMap[dateStr] = { date: dateStr, count: 0, revenue: 0 };
    }

    orders.forEach(ord => {
      const ordDate = new Date(ord.created_at).toLocaleDateString('az-AZ', { month: 'short', day: 'numeric' });
      if (daysMap[ordDate]) {
        daysMap[ordDate].count += 1;
        if (ord.status === 'approved') {
          daysMap[ordDate].revenue += Number(ord.total_price || 0);
        }
      }
    });

    return Object.values(daysMap);
  };

  // Prepare Category Products Pie/Bar Chart Data
  const getCategoryChartData = () => {
    const counts = {};
    Object.keys(CATEGORY_NAMES).forEach(cat => counts[cat] = 0);
    products.forEach(p => {
      if (counts[p.category] !== undefined) counts[p.category] += 1;
    });

    return Object.entries(counts).map(([cat, count]) => ({
      name: CATEGORY_NAMES[cat] || cat,
      count
    }));
  };

  const last7DaysData = getLast7DaysData();
  const categoryChartData = getCategoryChartData();
  const recent5Orders = orders.slice(0, 5);

  return (
    <div className="light-admin-layout">
      {/* Sidebar Navigation */}
      <aside className="light-sidebar">
        <div className="sidebar-brand">
          <FileText size={22} className="brand-icon" />
          <span>İdarəetmə Paneli</span>
        </div>

        <nav className="sidebar-menu">
          <button 
            className={`sidebar-link ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <Activity size={18} />
            <span>İcmal & Analytics</span>
          </button>

          <button 
            className={`sidebar-link ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            <ShoppingBag size={18} />
            <span>Sifarişlər</span>
            {pendingOrdersCount > 0 && <span className="badge-count">{pendingOrdersCount}</span>}
          </button>

          <button 
            className={`sidebar-link ${activeTab === 'products' ? 'active' : ''}`}
            onClick={() => setActiveTab('products')}
          >
            <Package size={18} />
            <span>Məhsullar ({products.length})</span>
          </button>

          <button 
            className={`sidebar-link ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <Users size={18} />
            <span>İstifadəçilər ({usersList.length})</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-logout-btn" onClick={onLogout}>
            <LogOut size={16} />
            <span>Çıxış</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="light-main-content">
        {/* Top Header */}
        <header className="content-top-bar">
          <div>
            <h1>
              {activeTab === 'overview' && 'Sistem İcmalı & Analitika'}
              {activeTab === 'orders' && 'Sifarişlərin İdarə Olunması'}
              {activeTab === 'products' && 'Məhsul Kataloqu'}
              {activeTab === 'users' && 'Qeydiyyatlı İstifadəçilər'}
            </h1>
            <p className="sub-text">Admin: {session?.user?.email}</p>
          </div>

          <div className="stats-pills">
            <button className="refresh-btn" onClick={fetchAllData}>
              <RefreshCw size={14} />
              <span>Məlumatları Yenilə</span>
            </button>
          </div>
        </header>

        {/* TAB 0: OVERVIEW & DASHBOARD CHARTS */}
        {activeTab === 'overview' && (
          <div className="dashboard-overview-container">
            {/* Stat Cards Row */}
            <div className="stats-grid">
              <div className="stat-card primary">
                <div className="stat-icon-wrapper"><Package size={22} /></div>
                <div className="stat-data">
                  <span className="stat-title">Cəmi Məhsul Sayı</span>
                  <span className="stat-value">{products.length}</span>
                </div>
              </div>

              <div className="stat-card success">
                <div className="stat-icon-wrapper"><ShoppingBag size={22} /></div>
                <div className="stat-data">
                  <span className="stat-title">Cəmi Sifariş Sayı</span>
                  <span className="stat-value">{orders.length}</span>
                </div>
              </div>

              <div className="stat-card warning">
                <div className="stat-icon-wrapper"><Clock size={22} /></div>
                <div className="stat-data">
                  <span className="stat-title">Gözləyən Sifarişlər</span>
                  <span className="stat-value">{pendingOrdersCount}</span>
                </div>
              </div>

              <div className="stat-card purple">
                <div className="stat-icon-wrapper"><Users size={22} /></div>
                <div className="stat-data">
                  <span className="stat-title">İstifadəçilər</span>
                  <span className="stat-value">{usersList.length}</span>
                </div>
              </div>
            </div>

            {/* Charts Row */}
            <div className="charts-row">
              {/* Chart 1: Last 7 Days Orders & Revenue */}
              <div className="chart-card">
                <div className="chart-header">
                  <TrendingUp size={18} className="chart-header-icon" />
                  <h4>Son 7 Günlük Sifariş Dinamikası</h4>
                </div>
                <div className="chart-body">
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={last7DaysData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                      <YAxis stroke="#94a3b8" fontSize={12} />
                      <Tooltip />
                      <Area type="monotone" dataKey="count" name="Sifariş Sayı" stroke="#2563eb" fill="#eff6ff" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 2: Category Distribution */}
              <div className="chart-card">
                <div className="chart-header">
                  <PieIcon size={18} className="chart-header-icon" />
                  <h4>Kateqoriyalara Görə Məhsul Sayı</h4>
                </div>
                <div className="chart-body">
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={categoryChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                      <YAxis stroke="#94a3b8" fontSize={12} />
                      <Tooltip />
                      <Bar dataKey="count" name="Məhsul Sayı" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                        {categoryChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Quick Recent 5 Orders Table */}
            <div className="table-card">
              <div className="table-card-header">
                <h3>Son 5 Daxil Olan Sifariş</h3>
                <button className="view-all-btn" onClick={() => setActiveTab('orders')}>Bütün Sifarişlər ➔</button>
              </div>
              <table className="light-table">
                <thead>
                  <tr>
                    <th>Sifariş Kodu</th>
                    <th>Müştəri</th>
                    <th>Məbləğ</th>
                    <th>Status</th>
                    <th>Tarix</th>
                  </tr>
                </thead>
                <tbody>
                  {recent5Orders.map(ord => (
                    <tr key={ord.id}>
                      <td><span className="code-tag">#{ord.id.substring(0, 8)}</span></td>
                      <td><strong>{ord.user_name || ord.user_email}</strong></td>
                      <td><strong className="price-text">{ord.total_price} AZN</strong></td>
                      <td>
                        <span className={`status-pill ${ord.status}`}>
                          {ord.status === 'approved' && 'Təsdiqləndi'}
                          {ord.status === 'rejected' && 'Rədd Edildi'}
                          {ord.status === 'pending' && 'Gözləmədə'}
                        </span>
                      </td>
                      <td>{new Date(ord.created_at).toLocaleDateString('az-AZ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 1: ORDERS SECTION */}
        {activeTab === 'orders' && (
          <div className="table-card">
            <div className="table-card-header">
              <h3>Bütün Sifarişlər ({orders.length})</h3>
              <button className="refresh-btn" onClick={fetchAllData}>
                <RefreshCw size={14} />
                <span>Yenilə</span>
              </button>
            </div>

            {loading ? (
              <p className="light-loading">Yüklənir...</p>
            ) : orders.length === 0 ? (
              <p className="light-empty">Hələ heç bir sifariş daxil olmayıb.</p>
            ) : (
              <table className="light-table">
                <thead>
                  <tr>
                    <th>Sifariş Kodu</th>
                    <th>Müştəri / Email</th>
                    <th>Komponentlər</th>
                    <th>Məbləğ</th>
                    <th>Ödəniş Çeki</th>
                    <th>Status</th>
                    <th>Əməliyyat</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(order => (
                    <tr key={order.id}>
                      <td>
                        <span className="code-tag">#{order.id.substring(0, 8)}</span>
                      </td>
                      <td>
                        <div className="user-cell">
                          <strong>{order.user_name || 'Müştəri'}</strong>
                          <span className="email-sub">{order.user_email}</span>
                        </div>
                      </td>
                      <td>
                        <div className="items-list-cell">
                          {Array.isArray(order.items) && order.items.map((it, idx) => (
                            <span key={idx} className="item-chip">{it.name}</span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <strong className="price-text">{order.total_price} AZN</strong>
                      </td>
                      <td>
                        {order.receipt_url ? (
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <button className="view-receipt-btn" onClick={() => setSelectedReceipt(order.receipt_url)}>
                              <Eye size={14} />
                              <span>Çekə Bax</span>
                            </button>
                            <button 
                              className="btn-reject" 
                              title="Çeki Sil"
                              onClick={() => handleDeleteReceipt(order.id, order.receipt_url)}
                            >
                              🗑️
                            </button>
                          </div>
                        ) : (
                          <span className="no-receipt">Çek Silinib / Yoxdur</span>
                        )}
                      </td>
                      <td>
                        <span className={`status-pill ${order.status}`}>
                          {order.status === 'approved' && 'Təsdiqləndi'}
                          {order.status === 'rejected' && 'Rədd Edildi'}
                          {order.status === 'pending' && 'Gözləmədə'}
                        </span>
                      </td>
                      <td>
                        <div className="status-action-btns">
                          <button 
                            className="btn-approve" 
                            title="Təsdiqlə"
                            onClick={() => handleUpdateOrderStatus(order.id, 'approved')}
                          >
                            <CheckCircle size={16} />
                          </button>
                          <button 
                            className="btn-reject" 
                            title="Rədd et"
                            onClick={() => handleUpdateOrderStatus(order.id, 'rejected')}
                          >
                            <XCircle size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* TAB 2: PRODUCTS SECTION */}
        {activeTab === 'products' && (
          <div className="table-card">
            <div className="table-card-header">
              <h3>Məhsullar ({products.length})</h3>
              <button className="create-prod-btn" onClick={() => { setEditingProduct(null); setIsProductModalOpen(true); }}>
                + Yeni Məhsul
              </button>
            </div>

            <table className="light-table">
              <thead>
                <tr>
                  <th>Şəkil</th>
                  <th>Ad</th>
                  <th>Brend</th>
                  <th>Kateqoriya</th>
                  <th>Qiymət</th>
                  <th>Status</th>
                  <th>Əməliyyatlar</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id}>
                    <td><img src={p.image} alt={p.name} className="light-thumb" /></td>
                    <td><strong>{p.name}</strong></td>
                    <td>{p.brand}</td>
                    <td>{p.category}</td>
                    <td>{p.price} AZN</td>
                    <td>
                      <span className={`status-pill ${p.is_active ? 'approved' : 'rejected'}`}>
                        {p.is_active ? 'Aktiv' : 'Deaktiv'}
                      </span>
                    </td>
                    <td>
                      <div className="status-action-btns">
                        <button 
                          className="btn-approve" 
                          title="Redaktə et"
                          onClick={() => { setEditingProduct(p); setIsProductModalOpen(true); }}
                        >
                          ✏️
                        </button>
                        <button 
                          className="btn-reject" 
                          title="Sil"
                          onClick={() => handleDeleteProduct(p.id, p.name)}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: USERS SECTION */}
        {activeTab === 'users' && (
          <div className="table-card">
            <div className="table-card-header">
              <h3>Qeydiyyatlı İstifadəçilər ({usersList.length})</h3>
            </div>

            <table className="light-table">
              <thead>
                <tr>
                  <th>Ad & Soyad</th>
                  <th>Email</th>
                  <th>Qeydiyyat Tarixi</th>
                  <th>Sifariş Sayı</th>
                </tr>
              </thead>
              <tbody>
                {usersList.map(u => {
                  const userOrdersCount = orders.filter(o => o.user_id === u.id).length;
                  return (
                    <tr key={u.id}>
                      <td><strong>{u.full_name || 'İstifadəçi'}</strong></td>
                      <td>{u.email}</td>
                      <td>{new Date(u.created_at).toLocaleDateString('az-AZ')}</td>
                      <td><span className="order-count-chip">{userOrdersCount} Sifariş</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Modal for Fullsize Receipt Preview */}
      {selectedReceipt && (
        <div className="modal-overlay" onClick={() => setSelectedReceipt(null)}>
          <div className="receipt-modal-box" onClick={e => e.stopPropagation()}>
            <div className="receipt-modal-header">
              <h4>Ödəniş Qəbzi (Çek)</h4>
              <button onClick={() => setSelectedReceipt(null)}>&times;</button>
            </div>
            <div className="receipt-image-wrapper">
              <img src={selectedReceipt} alt="Ödəniş Çeki" />
            </div>
          </div>
        </div>
      )}

      {/* Modal for Product Create / Edit */}
      {isProductModalOpen && (
        <ProductModal 
          editingProduct={editingProduct} 
          onClose={() => setIsProductModalOpen(false)} 
          onRefresh={fetchAllData} 
        />
      )}
    </div>
  );
}
