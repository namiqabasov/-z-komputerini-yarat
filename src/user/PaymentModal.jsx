import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { CreditCard, Upload, CheckCircle2, AlertCircle, Copy, ShieldCheck } from 'lucide-react';
import './PaymentModal.css';

export default function PaymentModal({ session, cartItems = [], selectedParts = {}, totalPrice, onClose, onSuccess, onRequireLogin }) {
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer'); // 'bank_transfer' or 'payriff'
  const [receiptUrl, setReceiptUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [copied, setCopied] = useState(false);

  const BANK_CARD = "4169 7388 1234 5678";
  const BANK_NAME = "ABB (Azerbaijan International Bank)";
  const ACCOUNT_HOLDER = "PC Builder MMC";

  const handleCopyCard = () => {
    navigator.clipboard.writeText(BANK_CARD.replace(/\s/g, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Upload Payment Receipt image to Supabase Storage ('receipts' bucket)
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!session) {
      onRequireLogin();
      return;
    }

    setUploading(true);
    setErrorMsg(null);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${session.user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadErr } = await supabase.storage
        .from('receipts')
        .upload(fileName, file);

      if (uploadErr) throw uploadErr;

      const { data: publicUrlData } = supabase.storage
        .from('receipts')
        .getPublicUrl(fileName);

      setReceiptUrl(publicUrlData.publicUrl);
    } catch (err) {
      setErrorMsg("Çek yüklənərkən xəta baş verdi: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();

    if (!session) {
      onRequireLogin();
      return;
    }

    if (paymentMethod === 'bank_transfer' && !receiptUrl) {
      setErrorMsg("Lütfən ödəniş etdikdən sonra çəkin şəklini yükləyin.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      let itemsList = [];

      if (cartItems && cartItems.length > 0) {
        // Items coming from Cart
        itemsList = cartItems.map(item => ({
          id: item.id,
          type: item.item_type,
          data: item.item_data,
          name: item.item_type === 'pc_build' ? (item.item_data?.build_name || 'Özəl PC Build') : item.item_data?.name,
          price: item.price,
          quantity: item.quantity
        }));
      } else if (selectedParts && Object.keys(selectedParts).length > 0) {
        // Items coming directly from PC Builder quick checkout
        itemsList = Object.entries(selectedParts)
          .filter(([_, item]) => item !== null)
          .map(([cat, item]) => ({
            category: cat,
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: 1
          }));
      }

      if (paymentMethod === 'payriff') {
        // 1. Create order record in Supabase with status 'pending'
        const { data: newOrder, error } = await supabase
          .from('orders')
          .insert([{
            user_id: session.user.id,
            user_email: session.user.email,
            user_name: session.user.user_metadata?.full_name || 'Müştəri',
            items: itemsList,
            total_price: totalPrice,
            payment_method: 'payriff',
            receipt_url: null,
            status: 'pending'
          }])
          .select()
          .single();

        if (error) throw error;

        // 2. Call Vercel Serverless Function /api/payriff-create-order
        const response = await fetch('/api/payriff-create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: newOrder.id,
            amount: totalPrice,
            description: `Sifariş #${newOrder.id.substring(0, 8)} - PC Builder`,
            userEmail: session.user.email,
            userName: session.user.user_metadata?.full_name || 'Müştəri'
          })
        });

        const payriffRes = await response.json();

        if (!response.ok || (payriffRes.code && payriffRes.code !== '00000')) {
          throw new Error(payriffRes.error || payriffRes.message || "Payriff sorğusu xətası");
        }

        // Empty user's cart
        if (cartItems && cartItems.length > 0) {
          await supabase.from('cart_items').delete().eq('user_id', session.user.id);
        }

        const paymentUrl = payriffRes.payload?.paymentUrl || payriffRes.paymentUrl;
        
        if (paymentUrl) {
          window.location.href = paymentUrl;
        } else {
          alert("🎯 [Payriff Test Rejimi]: Ödəniş linki yaradıldı! Real API Key-lər .env-ə yazılan kimi kart səhifəsinə yönləndiriləcək.");
          if (onSuccess) onSuccess();
          onClose();
        }
        return;
      }

      // BANK TRANSFER METHOD
      const orderPayload = {
        user_id: session.user.id,
        user_email: session.user.email,
        user_name: session.user.user_metadata?.full_name || 'Müştəri',
        items: itemsList,
        total_price: totalPrice,
        payment_method: 'bank_transfer',
        receipt_url: receiptUrl,
        status: 'pending'
      };

      const { error: insertErr } = await supabase
        .from('orders')
        .insert([orderPayload]);

      if (insertErr) {
        // Fallback if payment_method column is missing in database schema
        delete orderPayload.payment_method;
        const { error: retryErr } = await supabase.from('orders').insert([orderPayload]);
        if (retryErr) throw retryErr;
      }

      // Empty user's cart
      if (cartItems && cartItems.length > 0) {
        await supabase.from('cart_items').delete().eq('user_id', session.user.id);
      }

      alert("Sifarişiniz və ödəniş çeki uğurla göndərildi! Sifarişiniz təsdiqləndikdən sonra sizə bildiriş veriləcək.");
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error("Order creation error:", err);
      setErrorMsg("Sifariş yaradılarkən xəta: " + (err.message || JSON.stringify(err)));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content payment-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Sifarişi Rəsmiləşdir Və Ödəniş Et</h3>
          <button className="close-modal-btn" onClick={onClose}>&times;</button>
        </div>

        {errorMsg && (
          <div className="modal-error-alert">
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="payment-body">
          {/* Payment Method Selector Tabs */}
          <div className="payment-method-tabs">
            <button
              type="button"
              className={`method-tab-btn ${paymentMethod === 'bank_transfer' ? 'active' : ''}`}
              onClick={() => setPaymentMethod('bank_transfer')}
            >
              <CreditCard size={18} />
              <span>1. Bank Transferi (Çek yüklə)</span>
            </button>

            <button
              type="button"
              className={`method-tab-btn ${paymentMethod === 'payriff' ? 'active' : ''}`}
              onClick={() => setPaymentMethod('payriff')}
            >
              <ShieldCheck size={18} />
              <span>2. Kart ilə Onlayn (Payriff)</span>
            </button>
          </div>

          {paymentMethod === 'bank_transfer' ? (
            <>
              {/* Bank Transfer Instructions */}
              <div className="bank-info-box">
                <div className="bank-info-header">
                  <CreditCard size={20} className="bank-icon" />
                  <h4>Bank Transfer Rekvizitləri</h4>
                </div>
                
                <div className="bank-details">
                  <div className="detail-row">
                    <span>Bank:</span>
                    <strong>{BANK_NAME}</strong>
                  </div>
                  <div className="detail-row">
                    <span>Hesab Sahibi:</span>
                    <strong>{ACCOUNT_HOLDER}</strong>
                  </div>
                  <div className="detail-row card-num-row">
                    <span>Kart Nömrəsi:</span>
                    <div className="card-number-wrapper">
                      <strong className="card-num">{BANK_CARD}</strong>
                      <button className="copy-btn" onClick={handleCopyCard} title="Kopyala">
                        <Copy size={14} />
                        <span>{copied ? 'Kopyalandı!' : 'Kopyala'}</span>
                      </button>
                    </div>
                  </div>
                  <div className="detail-row total-highlight">
                    <span>Ödəniləcək Məbləğ:</span>
                    <span className="pay-amount">{totalPrice?.toFixed(0)} AZN</span>
                  </div>
                </div>
              </div>

              {/* Upload Receipt */}
              <form onSubmit={handleCreateOrder} className="receipt-upload-form">
                <div className="upload-box">
                  <label className="receipt-dropzone">
                    <Upload size={28} className="upload-icon" />
                    <span className="upload-title">Ödəniş Çekinin Şəklini Yüklə *</span>
                    <span className="upload-desc">Bank tətbiqindən ödəniş qəbzinin şəklini seçin</span>
                    <input type="file" accept="image/*" onChange={handleFileUpload} disabled={uploading} hidden />
                  </label>

                  {uploading && <p className="upload-status">Şəkil yüklənir...</p>}

                  {receiptUrl && (
                    <div className="receipt-preview-badge">
                      <CheckCircle2 size={16} />
                      <span>Çək yükləndi!</span>
                    </div>
                  )}
                </div>

                <div className="modal-footer">
                  <button type="button" className="cancel-btn" onClick={onClose}>Ləğv Et</button>
                  <button type="submit" className="save-btn" disabled={submitting || uploading}>
                    <ShieldCheck size={18} />
                    <span>{submitting ? 'Sifariş Göndərilir...' : 'Sifarişi Təsdiqlə'}</span>
                  </button>
                </div>
              </form>
            </>
          ) : (
            /* PAYRIFF ONLINE PAYMENT TAB CONTENT */
            <form onSubmit={handleCreateOrder} className="payriff-form-box">
              <div className="payriff-card-banner" style={{ background: 'rgba(37, 99, 235, 0.08)', border: '1px solid rgba(37, 99, 235, 0.3)', padding: '1.25rem', borderRadius: '12px', textAlign: 'center' }}>
                <ShieldCheck size={36} color="#2563eb" style={{ marginBottom: '8px' }} />
                <h4 style={{ color: 'var(--text-main)', margin: '0 0 6px 0' }}>Payriff Onlayn Kart Ödənişi</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                  Daxili Visa / MasterCard kartlarınızla təhlükəsiz 3D-Secure ödəniş edin.
                </p>
                <div className="detail-row total-highlight" style={{ marginTop: '1rem', justifyContent: 'center', gap: '10px' }}>
                  <span>Yekun Məbləğ:</span>
                  <span className="pay-amount">{totalPrice?.toFixed(0)} AZN</span>
                </div>
              </div>

              <div className="modal-footer" style={{ marginTop: '1rem' }}>
                <button type="button" className="cancel-btn" onClick={onClose}>Ləğv Et</button>
                <button type="submit" className="save-btn" style={{ background: '#2563eb' }} disabled={submitting}>
                  <CreditCard size={18} />
                  <span>{submitting ? 'Kart Ödənişinə Yönləndirilir...' : 'Payriff İlə Ödə'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
