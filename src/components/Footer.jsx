import React from 'react';
import { ShieldCheck, HardDrive, Cpu, Heart } from 'lucide-react';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-container">
        <div className="footer-brand">
          <h3>Öz Kompüterini Yığ</h3>
          <p>Azərbaycan bazarı üçün hazırlanmış dynamic PC Builder & komponent kataloqu platforması.</p>
        </div>
        <div className="footer-info">
          <span>&copy; {new Date().getFullYear()} Öz Kompüterini Yığ. Bütün hüquqlar qorunur.</span>
        </div>
      </div>
    </footer>
  );
}
