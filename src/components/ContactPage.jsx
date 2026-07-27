import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Mail, Phone, MessageSquare, Send, CheckCircle2, AlertCircle, Camera } from 'lucide-react';
import './ContactPage.css';

// Central configuration for contact links (easily customizable)
export const CONTACT_CONFIG = {
  phone: "+994 50 123 45 67",
  phoneRaw: "+994501234567",
  email: "info@pcbuilder.az",
  whatsapp: "https://wa.me/994501234567?text=Salam,%20PC%20y%C4%B1%C4%9Fmaq%20ist%C9%99yir%C9%99m",
  instagram: "https://instagram.com/pcbuilder.az",
  address: "Bakı şəhəri, 28 May küç. 45"
};

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccess(false);

    try {
      const { error } = await supabase
        .from('contact_messages')
        .insert([{
          name: name.trim(),
          email: email.trim(),
          subject: subject.trim(),
          message: message.trim(),
          is_read: false
        }]);

      if (error) throw error;

      setSuccess(true);
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    } catch (err) {
      setErrorMsg("Mesaj göndərilərkən xəta baş verdi: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="contact-page-container">
      <div className="contact-header">
        <h2><MessageSquare size={26} className="contact-title-icon" /> Bizimlə Əlaqə</h2>
        <p>Hər hansı sualınız, təklifiniz və ya xüsusi PC konfiqurasiya istəyiniz üçün bizə yazın.</p>
      </div>

      <div className="contact-layout">
        {/* Contact Form */}
        <div className="contact-form-card">
          <h3>Mesaj Göndərin</h3>

          {success && (
            <div className="contact-success-alert">
              <CheckCircle2 size={20} />
              <span>Təşəkkür edirik! Mesajınız uğurla göndərildi. Tezliklə sizinlə əlaqə saxlayacağıq.</span>
            </div>
          )}

          {errorMsg && (
            <div className="contact-error-alert">
              <AlertCircle size={20} />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="contact-form">
            <div className="form-row">
              <div className="form-group">
                <label>Ad və Soyadınız *</label>
                <input 
                  type="text" 
                  placeholder="Məs: Əli Məmmədov" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  required 
                />
              </div>

              <div className="form-group">
                <label>Email Ünvanınız *</label>
                <input 
                  type="email" 
                  placeholder="məs: ali@gmail.com" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  required 
                />
              </div>
            </div>

            <div className="form-group">
              <label>Mövzu</label>
              <input 
                type="text" 
                placeholder="Məs: Ən uyğun gaming PC məsləhəti" 
                value={subject} 
                onChange={e => setSubject(e.target.value)} 
              />
            </div>

            <div className="form-group">
              <label>Mesajınız *</label>
              <textarea 
                rows="5" 
                placeholder="Suallarınızı bura qeyd edin..." 
                value={message} 
                onChange={e => setMessage(e.target.value)} 
                required 
              />
            </div>

            <button type="submit" className="contact-submit-btn" disabled={loading}>
              <Send size={16} />
              <span>{loading ? 'Göndərilir...' : 'Mesajı Göndər'}</span>
            </button>
          </form>
        </div>

        {/* Static Contact Info Sidebar */}
        <div className="contact-info-sidebar">
          <div className="info-card">
            <h3>Birbaşa Əlaqə Vasitələri</h3>
            <p className="info-sub">Bizim komandamızla anında əlaqə saxlayın:</p>

            <div className="info-blocks">
              {/* WhatsApp */}
              <a href={CONTACT_CONFIG.whatsapp} target="_blank" rel="noopener noreferrer" className="info-block-item whatsapp">
                <div className="info-icon"><MessageSquare size={20} /></div>
                <div>
                  <strong>WhatsApp İlə Yazın</strong>
                  <span>Çat vasitəsilə 7/24 dəstək</span>
                </div>
              </a>

              {/* Instagram */}
              <a href={CONTACT_CONFIG.instagram} target="_blank" rel="noopener noreferrer" className="info-block-item instagram">
                <div className="info-icon"><Camera size={20} /></div>
                <div>
                  <strong>Instagram Səhifəmiz</strong>
                  <span>@pcbuilder.az</span>
                </div>
              </a>

              {/* Phone */}
              <a href={`tel:${CONTACT_CONFIG.phoneRaw}`} className="info-block-item phone">
                <div className="info-icon"><Phone size={20} /></div>
                <div>
                  <strong>Zəng Edin</strong>
                  <span>{CONTACT_CONFIG.phone}</span>
                </div>
              </a>

              {/* Email */}
              <a href={`mailto:${CONTACT_CONFIG.email}`} className="info-block-item email">
                <div className="info-icon"><Mail size={20} /></div>
                <div>
                  <strong>Email İlə Yazın</strong>
                  <span>{CONTACT_CONFIG.email}</span>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
