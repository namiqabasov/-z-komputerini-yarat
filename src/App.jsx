import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import Catalog from './components/Catalog';
import PcBuilder from './components/PcBuilder';

function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [selectedParts, setSelectedParts] = useState({
    cpu: null,
    motherboard: null,
    gpu: null,
    ram: null,
    storage: null,
    psu: null,
    case: null,
    cooler: null
  });

  const handleSelectPartFromCatalog = (product) => {
    if (!product || !product.category) return;
    setSelectedParts(prev => ({
      ...prev,
      [product.category]: product
    }));
    setActiveTab('builder');
  };

  return (
    <div className="app-layout" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />
      <main style={{ flex: 1, maxWidth: '1280px', margin: '0 auto', width: '100%', padding: '2rem 1.5rem' }}>
        {activeTab === 'home' ? (
          <Catalog 
            onNavigateToBuilder={() => setActiveTab('builder')}
            selectedParts={selectedParts}
            onSelectPart={handleSelectPartFromCatalog}
          />
        ) : (
          <PcBuilder 
            selectedParts={selectedParts}
            setSelectedParts={setSelectedParts}
          />
        )}
      </main>
      <Footer />
    </div>
  );
}

export default App;
