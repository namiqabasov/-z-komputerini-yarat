import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Upload, X, Save, Image as ImageIcon } from 'lucide-react';
import './ProductModal.css';

const CATEGORIES = [
  { id: 'cpu', name: 'Prosessor (CPU)' },
  { id: 'gpu', name: 'Videokart (GPU)' },
  { id: 'motherboard', name: 'Ana Plata (Motherboard)' },
  { id: 'ram', name: 'RAM (Operativ Yaddaş)' },
  { id: 'storage', name: 'Yaddaş (SSD/HDD)' },
  { id: 'psu', name: 'Qida Bloku (PSU)' },
  { id: 'case', name: 'Korpus (Case)' },
  { id: 'cooler', name: 'Soyuducu (Cooler)' }
];

export default function ProductModal({ editingProduct, onClose, onRefresh }) {
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    brand: '',
    category: 'cpu',
    price: 0,
    image: '',
    stock: 10,
    is_active: true,
    specsJson: '{}',
    compatibilityJson: '{}'
  });

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (editingProduct) {
      setFormData({
        id: editingProduct.id || '',
        name: editingProduct.name || '',
        brand: editingProduct.brand || '',
        category: editingProduct.category || 'cpu',
        price: editingProduct.price || 0,
        image: editingProduct.image || '',
        stock: editingProduct.stock ?? 10,
        is_active: editingProduct.is_active ?? true,
        specsJson: JSON.stringify(editingProduct.specs || {}, null, 2),
        compatibilityJson: JSON.stringify(editingProduct.compatibility || {}, null, 2)
      });
    } else {
      setFormData({
        id: `prod-${Date.now()}`,
        name: '',
        brand: '',
        category: 'cpu',
        price: 0,
        image: 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=500&q=80',
        stock: 10,
        is_active: true,
        specsJson: JSON.stringify({ socket: "AM5", cores: "6" }, null, 2),
        compatibilityJson: JSON.stringify({ socket: "AM5" }, null, 2)
      });
    }
  }, [editingProduct]);

  // Handle File Upload to Supabase Storage
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setErrorMsg(null);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `products/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get Public URL
      const { data: publicUrlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      setFormData(prev => ({
        ...prev,
        image: publicUrlData.publicUrl
      }));
    } catch (err) {
      setErrorMsg("Şəkil yüklənərkən xəta baş verdi: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);

    try {
      let parsedSpecs = {};
      let parsedCompatibility = {};

      try {
        parsedSpecs = JSON.parse(formData.specsJson);
      } catch (e) {
        throw new Error("Xüsusiyyətlər (Specs) düzgün JSON formatında deyil.");
      }

      try {
        parsedCompatibility = JSON.parse(formData.compatibilityJson);
      } catch (e) {
        throw new Error("Uyğunluq (Compatibility) düzgün JSON formatında deyil.");
      }

      const payload = {
        id: formData.id,
        name: formData.name,
        brand: formData.brand,
        category: formData.category,
        price: Number(formData.price),
        image: formData.image,
        stock: Number(formData.stock),
        is_active: formData.is_active,
        specs: parsedSpecs,
        compatibility: parsedCompatibility
      };

      const { error } = await supabase
        .from('products')
        .upsert(payload, { onConflict: 'id' });

      if (error) throw error;

      onRefresh();
      onClose();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content admin-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{editingProduct ? 'Məhsulu Redaktə Et' : 'Yeni Məhsul Əlavə Et'}</h3>
          <button className="close-modal-btn" onClick={onClose}>&times;</button>
        </div>

        {errorMsg && (
          <div className="modal-error-alert">
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="admin-form">
          <div className="form-grid">
            <div className="form-group">
              <label>Məhsul Adı *</label>
              <input 
                type="text" 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
                required 
              />
            </div>

            <div className="form-group">
              <label>Brend *</label>
              <input 
                type="text" 
                value={formData.brand} 
                onChange={e => setFormData({...formData, brand: e.target.value})} 
                required 
              />
            </div>

            <div className="form-group">
              <label>Kateqoriya *</label>
              <select 
                value={formData.category} 
                onChange={e => setFormData({...formData, category: e.target.value})}
              >
                {CATEGORIES.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Qiymət (AZN) *</label>
              <input 
                type="number" 
                value={formData.price} 
                onChange={e => setFormData({...formData, price: e.target.value})} 
                required 
              />
            </div>

            <div className="form-group">
              <label>Stok Sayı</label>
              <input 
                type="number" 
                value={formData.stock} 
                onChange={e => setFormData({...formData, stock: e.target.value})} 
              />
            </div>

            <div className="form-group checkbox-group">
              <label>
                <input 
                  type="checkbox" 
                  checked={formData.is_active} 
                  onChange={e => setFormData({...formData, is_active: e.target.checked})} 
                />
                <span>Aktiv Satışda</span>
              </label>
            </div>
          </div>

          {/* Image Section */}
          <div className="form-group image-upload-section">
            <label>Məhsul Şəkli (URL və ya Yüklə)</label>
            <div className="image-input-flex">
              <input 
                type="text" 
                placeholder="Şəkil URL daxil et..." 
                value={formData.image} 
                onChange={e => setFormData({...formData, image: e.target.value})} 
              />
              <label className="upload-file-btn">
                <Upload size={16} />
                <span>{uploading ? 'Yüklənir...' : 'Şəkil Yüklə'}</span>
                <input type="file" accept="image/*" onChange={handleFileUpload} disabled={uploading} hidden />
              </label>
            </div>
            {formData.image && (
              <div className="image-preview">
                <img src={formData.image} alt="Preview" />
              </div>
            )}
          </div>

          {/* JSON Editors */}
          <div className="form-grid">
            <div className="form-group">
              <label>Xüsusiyyətlər (Specs JSON)</label>
              <textarea 
                rows="4" 
                value={formData.specsJson} 
                onChange={e => setFormData({...formData, specsJson: e.target.value})} 
              />
            </div>

            <div className="form-group">
              <label>Uyğunluq (Compatibility JSON)</label>
              <textarea 
                rows="4" 
                value={formData.compatibilityJson} 
                onChange={e => setFormData({...formData, compatibilityJson: e.target.value})} 
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="cancel-btn" onClick={onClose}>Ləğv Et</button>
            <button type="submit" className="save-btn" disabled={saving}>
              <Save size={16} />
              <span>{saving ? 'Yadda saxlanılır...' : 'Yadda Saxla'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
