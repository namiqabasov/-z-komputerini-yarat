import React, { useState, useEffect } from 'react';
import { Cpu, Monitor, Database, MemoryStick, HardDrive, Zap, Box, Thermometer, AlertTriangle, CheckCircle2, Plus, Trash2, RefreshCw } from 'lucide-react';
import ProductCard from './ProductCard';
import VisualPC from './VisualPC';
import './PcBuilder.css';

const CATEGORIES = [
  { id: 'cpu', name: 'Prosessor (CPU)', icon: <Cpu size={18} /> },
  { id: 'motherboard', name: 'Ana Plata (Motherboard)', icon: <Database size={18} /> },
  { id: 'gpu', name: 'Videokart (GPU)', icon: <Monitor size={18} /> },
  { id: 'ram', name: 'RAM (Operativ Yaddaş)', icon: <MemoryStick size={18} /> },
  { id: 'storage', name: 'Yaddaş (SSD/HDD)', icon: <HardDrive size={18} /> },
  { id: 'psu', name: 'Qida Bloku (PSU)', icon: <Zap size={18} /> },
  { id: 'case', name: 'Korpus (Case)', icon: <Box size={18} /> },
  { id: 'cooler', name: 'Soyuducu (Cooler)', icon: <Thermometer size={18} /> }
];

export default function PcBuilder({ selectedParts, setSelectedParts, onOpenCheckout }) {
  const [partData, setPartData] = useState({});
  const [activeModalCat, setActiveModalCat] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [loadingModal, setLoadingModal] = useState(false);

  // Load all component data immediately
  useEffect(() => {
    async function loadAllParts() {
      const dataObj = {};
      for (const cat of CATEGORIES) {
        try {
          const res = await fetch(`/data/${cat.id}.json`);
          if (res.ok) {
            dataObj[cat.id] = await res.json();
          }
        } catch (e) {
          console.error(`Xəta ${cat.id}:`, e);
        }
      }
      setPartData(dataObj);
    }
    loadAllParts();
  }, []);

  // Open modal and fetch category data if not present
  const handleOpenModal = async (catId) => {
    setActiveModalCat(catId);
    if (!partData[catId] || partData[catId].length === 0) {
      setLoadingModal(true);
      try {
        const res = await fetch(`/data/${catId}.json`);
        if (res.ok) {
          const items = await res.json();
          setPartData(prev => ({ ...prev, [catId]: items }));
        }
      } catch (err) {
        console.error("Modal data fetch error:", err);
      } finally {
        setLoadingModal(false);
      }
    }
  };

  // Check Compatibility logic
  useEffect(() => {
    const newWarnings = [];
    const { cpu, motherboard, ram, psu, case: pcCase, gpu } = selectedParts;

    if (cpu && motherboard) {
      const cpuSocket = cpu.compatibility?.socket;
      const mbSocket = motherboard.compatibility?.socket;
      if (cpuSocket && mbSocket && cpuSocket !== mbSocket) {
        newWarnings.push(`Uyğunsuzluq: CPU soketi (${cpuSocket}) ilə Ana Plata soketi (${mbSocket}) uyğun gəlmir!`);
      }
    }

    if (ram && motherboard) {
      const ramType = ram.compatibility?.ramType;
      const mbRamType = motherboard.compatibility?.ramType;
      if (ramType && mbRamType && ramType !== mbRamType) {
        newWarnings.push(`Uyğunsuzluq: RAM növü (${ramType}) ilə Ana Plata RAM dəstəyi (${mbRamType}) üst-üstə düşmür!`);
      }
    }

    if (psu && gpu) {
      const minWatt = gpu.compatibility?.minPsuWatts || 500;
      const psuWatt = psu.compatibility?.wattage || 0;
      if (psuWatt < minWatt) {
        newWarnings.push(`Xəbərdarlıq: Seçilən Qida Bloku (${psuWatt}W) videokartın tövsiyə olunan minimum gücündən (${minWatt}W) aşağıdır!`);
      }
    }

    if (pcCase && motherboard) {
      const mbFF = motherboard.compatibility?.formFactor;
      const supportedFF = pcCase.compatibility?.supportedFormFactors || [];
      if (mbFF && supportedFF.length > 0 && !supportedFF.includes(mbFF)) {
        newWarnings.push(`Uyğunsuzluq: Korpus (${supportedFF.join(', ')}) seçilən Ana Platanın ölçüsünü (${mbFF}) dəstəkləmir!`);
      }
    }

    setWarnings(newWarnings);
  }, [selectedParts]);

  const handleSelectPart = (catId, product) => {
    setSelectedParts(prev => ({
      ...prev,
      [catId]: product
    }));
    setActiveModalCat(null);
  };

  const handleRemovePart = (catId) => {
    setSelectedParts(prev => ({
      ...prev,
      [catId]: null
    }));
  };

  const handleClearAll = () => {
    setSelectedParts({
      cpu: null,
      motherboard: null,
      gpu: null,
      ram: null,
      storage: null,
      psu: null,
      case: null,
      cooler: null
    });
  };

  // Quick Preset Builder (Tövsiyə olunan hazır sistemlər)
  const handleLoadPreset = async (presetType) => {
    let currentData = { ...partData };

    // Ensure data is loaded
    if (!currentData.cpu) {
      for (const cat of CATEGORIES) {
        try {
          const res = await fetch(`/data/${cat.id}.json`);
          if (res.ok) {
            currentData[cat.id] = await res.json();
          }
        } catch (e) {
          console.error(e);
        }
      }
      setPartData(currentData);
    }

    if (presetType === 'budget') {
      setSelectedParts({
        cpu: currentData.cpu?.find(p => p.id === 'cpu-1') || null,
        motherboard: currentData.motherboard?.find(p => p.id === 'mb-1') || null,
        gpu: currentData.gpu?.find(p => p.id === 'gpu-1') || null,
        ram: currentData.ram?.find(p => p.id === 'ram-1') || null,
        storage: currentData.storage?.find(p => p.id === 'st-1') || null,
        psu: currentData.psu?.find(p => p.id === 'psu-2') || null,
        case: currentData.case?.find(p => p.id === 'case-1') || null,
        cooler: currentData.cooler?.find(p => p.id === 'cooler-1') || null
      });
    } else if (presetType === 'medium') {
      setSelectedParts({
        cpu: currentData.cpu?.find(p => p.id === 'cpu-3') || null,
        motherboard: currentData.motherboard?.find(p => p.id === 'mb-3') || null,
        gpu: currentData.gpu?.find(p => p.id === 'gpu-3') || null,
        ram: currentData.ram?.find(p => p.id === 'ram-5') || null,
        storage: currentData.storage?.find(p => p.id === 'st-3') || null,
        psu: currentData.psu?.find(p => p.id === 'psu-4') || null,
        case: currentData.case?.find(p => p.id === 'case-3') || null,
        cooler: currentData.cooler?.find(p => p.id === 'cooler-4') || null
      });
    } else if (presetType === 'beast') {
      setSelectedParts({
        cpu: currentData.cpu?.find(p => p.id === 'cpu-8') || null,
        motherboard: currentData.motherboard?.find(p => p.id === 'mb-8') || null,
        gpu: currentData.gpu?.find(p => p.id === 'gpu-8') || null,
        ram: currentData.ram?.find(p => p.id === 'ram-7') || null,
        storage: currentData.storage?.find(p => p.id === 'st-3') || null,
        psu: currentData.psu?.find(p => p.id === 'psu-7') || null,
        case: currentData.case?.find(p => p.id === 'case-5') || null,
        cooler: currentData.cooler?.find(p => p.id === 'cooler-7') || null
      });
    }
  };

  const totalPrice = Object.values(selectedParts).reduce((sum, item) => sum + (item ? item.price : 0), 0);
  const selectedCount = Object.values(selectedParts).filter(Boolean).length;

  return (
    <div className="pc-builder-container">
      <div className="builder-header-banner">
        <div>
          <h2>Öz Kompüterini Yığ (PC Builder)</h2>
          <p>Düzgün hissələri seçin, avtomatik uyğunluq sistemimiz potensial xətaları aşkar etsin.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="preset-btn budget" onClick={() => handleLoadPreset('budget')}>
            ⚡ Büdcə Build (~1200 AZN)
          </button>
          <button className="preset-btn medium" onClick={() => handleLoadPreset('medium')}>
            🚀 Optimal Build (~2700 AZN)
          </button>
          <button className="preset-btn beast" onClick={() => handleLoadPreset('beast')}>
            🔥 Canavar Build (~10,000 AZN)
          </button>
          {selectedCount > 0 && (
            <button className="clear-btn" onClick={handleClearAll}>
              <Trash2 size={16} />
              <span>Sıfırla</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div className="builder-layout">
        <div className="slots-section">
          {/* Compatibility Alerts */}
          {warnings.length > 0 && (
            <div className="compatibility-alert-box">
              <AlertTriangle className="alert-icon" size={24} />
              <div className="alert-content">
                <h4>Uyğunsuzluq Xəbərdarlığı ({warnings.length})</h4>
                <ul>
                  {warnings.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {selectedCount === 8 && warnings.length === 0 && (
            <div className="compatibility-success-box">
              <CheckCircle2 size={24} />
              <span>Təbrik edirik! Seçdiyiniz bütün 8 komponent bir-biri ilə tam uyğundur.</span>
            </div>
          )}

          {/* Component Slots */}
          <div className="slots-list">
            {CATEGORIES.map(cat => {
              const selectedItem = selectedParts[cat.id];
              return (
                <div key={cat.id} className={`part-slot ${selectedItem ? 'filled' : 'empty'}`}>
                  <div className="slot-icon-name">
                    <span className="slot-cat-icon">{cat.icon}</span>
                    <span className="slot-cat-name">{cat.name}</span>
                  </div>

                  {selectedItem ? (
                    <div className="slot-selected-info">
                      <img src={selectedItem.image} alt={selectedItem.name} className="slot-thumb" />
                      <div className="slot-details">
                        <span className="slot-item-title">{selectedItem.name}</span>
                        <span className="slot-item-price">{selectedItem.price} AZN</span>
                      </div>
                      <div className="slot-actions">
                        <button className="action-btn change" title="Dəyişdir" onClick={() => handleOpenModal(cat.id)}>
                          <RefreshCw size={14} />
                        </button>
                        <button className="action-btn remove" title="Sil" onClick={() => handleRemovePart(cat.id)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button className="add-part-btn" onClick={() => handleOpenModal(cat.id)}>
                      <Plus size={16} />
                      <span>Hissə Seç</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Visual PC & Summary */}
        <div className="summary-sidebar">
          <VisualPC selectedParts={selectedParts} />

          <div className="summary-card">
            <h3>Ümumi Məbləğ</h3>
            <div className="price-breakdown">
              <div className="summary-row">
                <span>Seçilən Hissələr:</span>
                <span className="count-tag">{selectedCount} / 8</span>
              </div>
              <div className="summary-row total">
                <span>Yekun Qiymət:</span>
                <span className="total-val">{totalPrice} AZN</span>
              </div>
            </div>

            <button 
              className="checkout-btn"
              disabled={selectedCount === 0}
              onClick={() => onOpenCheckout ? onOpenCheckout() : alert(`Yığılan PC-nin ümumi qiyməti: ${totalPrice} AZN`)}
            >
              Sifariş Et Və Ödəniş
            </button>
          </div>
        </div>
      </div>

      {/* Modal for Selecting Component */}
      {activeModalCat && (
        <div className="modal-overlay" onClick={() => setActiveModalCat(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {CATEGORIES.find(c => c.id === activeModalCat)?.name} Seçin
              </h3>
              <button className="close-modal-btn" onClick={() => setActiveModalCat(null)}>&times;</button>
            </div>

            {loadingModal ? (
              <div className="loading-state" style={{ padding: '3rem 1rem' }}>
                <div className="spinner"></div>
                <p>Hissələr yüklənir...</p>
              </div>
            ) : (
              <div className="modal-grid">
                {(partData[activeModalCat] || []).map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    category={activeModalCat}
                    isSelected={selectedParts[activeModalCat]?.id === product.id}
                    onSelect={(p) => handleSelectPart(activeModalCat, p)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
