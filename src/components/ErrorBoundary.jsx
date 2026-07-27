import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("React Error Boundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '2.5rem',
          textAlign: 'center',
          background: 'rgba(19, 27, 46, 0.95)',
          border: '1px solid #ef4444',
          borderRadius: '16px',
          margin: '2rem 0',
          color: '#f8fafc'
        }}>
          <h3 style={{ color: '#ef4444', marginBottom: '0.5rem' }}>⚠️ Xəta Baş Verdi</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.2rem' }}>
            Komponent yüklənərkən gözlənilməz xəta baş verdi.
          </p>
          <button 
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            style={{
              background: '#ef4444',
              color: '#fff',
              border: 'none',
              padding: '0.6rem 1.5rem',
              borderRadius: '8px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            Səhifəni Yenilə
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
