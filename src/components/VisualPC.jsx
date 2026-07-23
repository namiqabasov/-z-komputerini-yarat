import React from 'react';
import './VisualPC.css';

export default function VisualPC({ selectedParts }) {
  const { gpu, case: pcCase, cooler, ram } = selectedParts;

  // Determine RGB LED glow color from selected case or default cyan
  const rgbColor = pcCase?.compatibility?.rgbColor || '#00f0ff';
  
  // Determine GPU card accent color
  const gpuColor = gpu?.compatibility?.color || '#3a4b6e';

  return (
    <div className="visual-pc-container">
      <div className="visual-pc-header">
        <h4>Vizual PC Modeli</h4>
        <span className="live-status">CANLI PREVIEW</span>
      </div>

      <div className="pc-case-frame" style={{ '--rgb-glow': rgbColor }}>
        {/* Case Outer Chassis */}
        <svg viewBox="0 0 300 400" className="pc-svg">
          <defs>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <linearGradient id="glassGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(255, 255, 255, 0.08)" />
              <stop offset="100%" stopColor="rgba(0, 0, 0, 0.4)" />
            </linearGradient>
          </defs>

          {/* Outer Case Frame */}
          <rect x="10" y="10" width="280" height="380" rx="12" fill="#111625" stroke="#253352" strokeWidth="4" />
          
          {/* Internal Chamber Background */}
          <rect x="25" y="25" width="250" height="350" rx="6" fill="#090d16" />

          {/* Motherboard Tray PCB */}
          <rect x="50" y="40" width="200" height="260" rx="4" fill="#18233c" stroke="#2a3c66" strokeWidth="2" />
          {/* PCB Circuits Details */}
          <path d="M 60 50 L 100 50 L 120 70 M 150 50 L 230 50 M 60 280 L 180 280" stroke="#00f0ff" strokeWidth="1" opacity="0.3" fill="none" />

          {/* CPU Socket & Cooler */}
          <g id="cpu-cooler-group">
            <rect x="120" y="80" width="60" height="60" rx="4" fill="#2d3b59" stroke="#00f0ff" strokeWidth="1.5" />
            {cooler ? (
              <g filter="url(#glow)">
                <circle cx="150" cy="110" r="26" fill="none" stroke={rgbColor} strokeWidth="4" className="fan-spin" />
                <circle cx="150" cy="110" r="12" fill={rgbColor} opacity="0.8" />
              </g>
            ) : (
              <text x="150" y="114" fill="#8a99ad" fontSize="10" textAnchor="middle">SOCKET</text>
            )}
          </g>

          {/* RAM Slots & Sticks */}
          <g id="ram-group">
            <rect x="195" y="75" width="6" height="70" fill="#0b0f19" />
            <rect x="205" y="75" width="6" height="70" fill="#0b0f19" />
            {ram && (
              <>
                <rect x="195" y="75" width="6" height="70" fill={rgbColor} filter="url(#glow)" />
                <rect x="205" y="75" width="6" height="70" fill={rgbColor} filter="url(#glow)" />
              </>
            )}
          </g>

          {/* GPU Card */}
          <g id="gpu-group">
            {gpu ? (
              <g filter="url(#glow)">
                <rect x="55" y="170" width="180" height="48" rx="6" fill="#1a233a" stroke={gpuColor} strokeWidth="3" />
                {/* Dual Fans on GPU */}
                <circle cx="105" cy="194" r="16" fill="none" stroke={gpuColor} strokeWidth="2.5" className="fan-spin" />
                <circle cx="175" cy="194" r="16" fill="none" stroke={gpuColor} strokeWidth="2.5" className="fan-spin" />
                <rect x="65" y="190" width="20" height="8" fill={gpuColor} rx="2" />
                <text x="140" y="182" fill="#fff" fontSize="8" fontWeight="bold">GEFORCE RTX</text>
              </g>
            ) : (
              <rect x="55" y="170" width="180" height="40" rx="4" fill="#141c2e" stroke="#253352" strokeWidth="1" strokeDasharray="4" />
            )}
          </g>

          {/* PSU Shroud (Bottom) */}
          <rect x="25" y="310" width="250" height="65" fill="#131a2b" stroke="#202c47" strokeWidth="2" />
          <text x="150" y="348" fill="#506385" fontSize="12" fontWeight="bold" textAnchor="middle" letterSpacing="2">POWER SUPPLY</text>

          {/* Case Front RGB Fans */}
          <g id="front-fans">
            <circle cx="35" cy="80" r="18" fill="none" stroke={rgbColor} strokeWidth="3" opacity="0.8" filter="url(#glow)" className="fan-spin" />
            <circle cx="35" cy="150" r="18" fill="none" stroke={rgbColor} strokeWidth="3" opacity="0.8" filter="url(#glow)" className="fan-spin" />
            <circle cx="35" cy="220" r="18" fill="none" stroke={rgbColor} strokeWidth="3" opacity="0.8" filter="url(#glow)" className="fan-spin" />
          </g>

          {/* Glass Panel Reflection Overlay */}
          <rect x="25" y="25" width="250" height="350" rx="6" fill="url(#glassGrad)" pointerEvents="none" />
        </svg>
      </div>
    </div>
  );
}
