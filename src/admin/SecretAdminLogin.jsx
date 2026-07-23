import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import './SecretAdminLogin.css';

export default function SecretAdminLogin({ onAdminLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.session) {
        // Verify via RPC or admins table query if user is super-admin
        const { data: isAdminData, error: adminErr } = await supabase.rpc('is_admin');
        
        if (adminErr || !isAdminData) {
          // If not in admins table, sign out immediately
          await supabase.auth.signOut();
          throw new Error("Giriş qadağandır! Sizin admin icazəniz yoxdur.");
        }

        onAdminLoginSuccess(data.session);
      }
    } catch (err) {
      setErrorMsg(err.message || "Admin girişi uğursuz oldu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="secret-admin-body">
      <div className="secret-admin-box">
        <h3 className="secret-admin-title">Sistem Girişi</h3>

        {errorMsg && (
          <div className="secret-error-alert">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleAdminLogin} className="secret-form">
          <div className="secret-field">
            <label>İstifadəçi adı / Email</label>
            <input 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
            />
          </div>

          <div className="secret-field">
            <label>Parol</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
            />
          </div>

          <button type="submit" className="secret-submit-btn" disabled={loading}>
            {loading ? 'Yoxlanılır...' : 'Daxil Ol'}
          </button>
        </form>
      </div>
    </div>
  );
}
