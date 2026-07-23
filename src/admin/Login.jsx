import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Lock, Mail, ShieldAlert, Cpu } from 'lucide-react';
import './Login.css';

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (data.session) {
        onLoginSuccess(data.session);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Giriş uğursuz oldu. Email və parolu yoxlayın.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo-icon">
            <Cpu size={32} />
          </div>
          <h2>Admin Panelə Giriş</h2>
          <p>Davam etmək üçün admin hesabınızla daxil olun</p>
        </div>

        {errorMsg && (
          <div className="login-error-alert">
            <ShieldAlert size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="login-form">
          <div className="input-field">
            <Mail size={18} className="input-icon" />
            <input 
              type="email" 
              placeholder="Admin Email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-field">
            <Lock size={18} className="input-icon" />
            <input 
              type="password" 
              placeholder="Parol" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="login-submit-btn" disabled={loading}>
            {loading ? 'Daxil olunur...' : 'Giriş Et'}
          </button>
        </form>
      </div>
    </div>
  );
}
