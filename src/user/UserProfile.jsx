import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { User, Mail, Calendar, ShoppingBag, Clock, CheckCircle2, XCircle, LogOut } from 'lucide-react';
import './UserProfile.css';

export default function UserProfile({ session, onLogout }) {
  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUserData() {
      if (!session?.user?.id) return;
      setLoading(true);

      try {
        // Fetch Profile Metadata
        const { data: profData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        setProfile(profData || { email: session.user.email });

        // Fetch User's Orders
        const { data: ordData, error: ordErr } = await supabase
          .from('orders')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });

        if (!ordErr) {
          setOrders(ordData || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadUserData();
  }, [session]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return <span className="status-badge approved"><CheckCircle2 size={14} /> Təsdiqləndi</span>;
      case 'rejected':
        return <span className="status-badge rejected"><XCircle size={14} /> Rədd Edildi</span>;
      default:
        return <span className="status-badge pending"><Clock size={14} /> Gözləmədə</span>;
    }
  };

  return (
    <div className="user-profile-container">
      {/* Profile Header */}
      <div className="profile-card">
        <div className="profile-header-info">
          <div className="profile-avatar">
            <User size={32} />
          </div>
          <div>
            <h3>{profile?.full_name || 'İstifadəçi Profil'}</h3>
            <p className="profile-email"><Mail size={14} /> {session?.user?.email}</p>
          </div>
        </div>
        <button className="user-logout-btn" onClick={onLogout}>
          <LogOut size={16} />
          <span>Çıxış</span>
        </button>
      </div>

      {/* Orders History Section */}
      <div className="orders-section">
        <h3>Sifariş Tarixçəniz</h3>
        {loading ? (
          <p className="loading-text">Sifarişlər yüklənir...</p>
        ) : orders.length === 0 ? (
          <div className="no-orders-box">
            <ShoppingBag size={40} />
            <p>Hələ heç bir sifarişiniz yoxdur.</p>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map(order => (
              <div key={order.id} className="order-item-card">
                <div className="order-item-header">
                  <span className="order-id">Sifariş #{order.id.substring(0, 8)}</span>
                  <span className="order-date">
                    <Calendar size={13} /> {new Date(order.created_at).toLocaleDateString('az-AZ')}
                  </span>
                  {getStatusBadge(order.status)}
                </div>

                <div className="order-items-summary">
                  <h5>Yığılan Komponentlər:</h5>
                  <ul>
                    {Array.isArray(order.items) && order.items.map((item, idx) => (
                      <li key={idx}>
                        <span>{item.name}</span>
                        <strong>{item.price} AZN</strong>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="order-item-footer">
                  <span>Yekun Məbləğ:</span>
                  <span className="order-total">{order.total_price} AZN</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
