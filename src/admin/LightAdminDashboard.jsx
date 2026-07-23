import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  ShoppingBag, Users, Package, CheckCircle, XCircle, 
  Clock, Eye, LogOut, Search, Filter, RefreshCw, FileText 
} from 'lucide-react';
import ProductModal from './ProductModal';
import './LightAdminDashboard.css';

export default function LightAdminDashboard({ session, onLogout }) {
  const [activeTab, setActiveTab] = useState('orders'); // 'orders', 'products', 'users'
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal for view receipt image
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  // Modal for Create/Edit Products
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      setProducts(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      setUsersList(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchProducts();
    fetchUsers();
  }, []);

  // Update order status
  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;
      fetchOrders();
    } catch (err) {
      alert("Status yenilənmə xətası: " + err.message);
    }
  };

  const pendingOrdersCount = orders.filter(o => o.status === 'pending').length;
  const totalRevenue = orders.filter(o => o.status === 'approved').reduce((sum, o) => sum + (o.total_price || 0), 0);

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
            <h1>{activeTab === 'orders' ? 'Sifarişlərin İdarə Olunması' : activeTab === 'products' ? 'Məhsul Kataloqu' : 'Qeydiyyatlı İstifadəçilər'}</h1>
            <p className="sub-text">Admin: {session?.user?.email}</p>
          </div>

          <div className="stats-pills">
            <div className="pill-item">
              <span className="pill-label">Gözləyən Sifariş:</span>
              <strong className="pill-val warning">{pendingOrdersCount}</strong>
            </div>
            <div className="pill-item">
              <span className="pill-label">Təsdiqlənən Dövriyyə:</span>
              <strong className="pill-val success">{totalRevenue} AZN</strong>
            </div>
          </div>
        </header>

        {/* TAB 1: ORDERS SECTION */}
        {activeTab === 'orders' && (
          <div className="table-card">
            <div className="table-card-header">
              <h3>Bütün Sifarişlər ({orders.length})</h3>
              <button className="refresh-btn" onClick={fetchOrders}>
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
                          <button className="view-receipt-btn" onClick={() => setSelectedReceipt(order.receipt_url)}>
                            <Eye size={14} />
                            <span>Çekə Bax</span>
                          </button>
                        ) : (
                          <span className="no-receipt">Çek Yoxdur</span>
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
          onRefresh={fetchProducts} 
        />
      )}
    </div>
  );
}
