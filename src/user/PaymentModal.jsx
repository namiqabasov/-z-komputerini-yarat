import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { CreditCard, Upload, CheckCircle2, AlertCircle, Copy, ShieldCheck } from 'lucide-react';
import './PaymentModal.css';

export default function PaymentModal({ session, selectedParts, totalPrice, onClose, onSuccess, onRequireLogin }) {
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

    if (!receiptUrl) {
      setErrorMsg("Lütfən ödəniş etdikdən sonra çəkin şəklini yükləyin.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const itemsList = Object.entries(selectedParts)
        .filter(([_, item]) => item !== null)
        .map(([cat, item]) => ({
          category: cat,
          id: item.id,
          name: item.name,
          price: item.price
        }));

      const { data, error } = await supabase
        .from('orders')
        .insert([{
          user_id: session.user.id,
          user_email: session.user.email,
          user_name: session.user.user_metadata?.full_name || 'Müştəri',
          items: itemsList,
          total_price: totalPrice,
          receipt_url: receiptUrl,
          status: 'pending'
        }]);

      if (error) throw error;

      alert("Sifarişiniz və ödəniş çeki uğurla göndərildi! Sifarişiniz təsdiqləndikdən sonra sizə bildiriş veriləcək.");
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setErrorMsg("Sifariş yaradılarkən xəta: " + err.message);
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
                <span className="pay-amount">{totalPrice} AZN</span>
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
        </div>
      </div>
    </div>
  );
}
