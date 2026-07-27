import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Mail, Lock, User, LogIn, UserPlus, AlertCircle } from 'lucide-react';
import './UserAuth.css';

export default function UserAuth({ onAuthSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      if (isRegister) {
        // Sign Up User
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName }
          }
        });

        if (error) throw error;

        if (data.user) {
          // Insert profile details
          await supabase.from('profiles').upsert({
            id: data.user.id,
            full_name: fullName,
            email: email
          });
        }
        alert("Qeydiyyat uğurla tamamlandı! İndi daxil ola bilərsiniz.");
        setIsRegister(false);
      } else {
        // 1. Check BEFORE login if this email is registered as an Admin
        const { data: adminCheck } = await supabase
          .from('admins')
          .select('id')
          .eq('email', email.trim().toLowerCase())
          .maybeSingle();

        if (adminCheck) {
          // BLOCK IMMEDIATELY before creating any session
          throw new Error("Təhlükəsizlik Xəbərdarlığı: Admin hesabları ilə adi istifadəçi girişindən daxil olmaq qadağandır!");
        }

        // 2. Proceed with user sign in
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });

        if (error) throw error;

        // 3. Double-check via RPC as secondary safety lock
        if (data.session) {
          const { data: isAdmin } = await supabase.rpc('is_admin');
          if (isAdmin) {
            await supabase.auth.signOut();
            localStorage.clear();
            sessionStorage.clear();
            throw new Error("Təhlükəsizlik Xəbərdarlığı: Admin hesabları ilə adi istifadəçi girişindən daxil olmaq qadağandır!");
          }

          // Sync localStorage wishlist to Supabase DB upon login
          try {
            const guestWishlist = JSON.parse(localStorage.getItem('guest_wishlist') || '[]');
            if (guestWishlist.length > 0) {
              const wishlistPayload = guestWishlist.map(prod => ({
                user_id: data.session.user.id,
                product_id: prod.id,
                product_data: prod
              }));

              await supabase.from('wishlist').upsert(wishlistPayload, { onConflict: 'user_id,product_id' });
              localStorage.removeItem('guest_wishlist');
            }
          } catch (e) {
            console.error("Wishlist sync error:", e);
          }

          if (onAuthSuccess) {
            onAuthSuccess(data.session);
          }
        }
      }
    } catch (err) {
      setErrorMsg(err.message || "Xəta baş verdi. Zəhmət olmasa təkrarlayın.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="user-auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>{isRegister ? 'Yeni Hesab Yarat' : 'İstifadəçi Girişi'}</h2>
          <p>{isRegister ? 'PC yığmaq və sifarişlərinizi izləmək üçün qeydiyyatdan keçin' : 'Davam etmək üçün hesabınıza daxil olun'}</p>
        </div>

        {errorMsg && (
          <div className="auth-error-box">
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          {isRegister && (
            <div className="auth-field">
              <User size={18} className="field-icon" />
              <input 
                type="text" 
                placeholder="Ad və Soyad" 
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="auth-field">
            <Mail size={18} className="field-icon" />
            <input 
              type="email" 
              placeholder="Email ünvanı" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="auth-field">
            <Lock size={18} className="field-icon" />
            <input 
              type="password" 
              placeholder="Parol" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? 'Gözləyin...' : (isRegister ? 'Qeydiyyatdan Keç' : 'Daxil Ol')}
          </button>
        </form>

        <div className="auth-toggle-footer">
          <span>{isRegister ? 'Artıq hesabınız var?' : 'Hesabınız yoxdur?'}</span>
          <button className="toggle-mode-btn" onClick={() => { setIsRegister(!isRegister); setErrorMsg(null); }}>
            {isRegister ? 'Giriş Et' : 'Hesab Yarat'}
          </button>
        </div>
      </div>
    </div>
  );
}
