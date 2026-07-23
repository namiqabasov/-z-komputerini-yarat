import React from 'react';
import Login from './Login';

export default function ProtectedRoute({ session, children, onLoginSuccess }) {
  if (!session) {
    return <Login onLoginSuccess={onLoginSuccess} />;
  }

  return children;
}
