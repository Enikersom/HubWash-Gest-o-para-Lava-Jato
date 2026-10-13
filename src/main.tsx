import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Silencia avisos inócuos de WebSocket do Vite no ambiente de preview (HMR desativado)
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason?.message || String(event.reason || '');
    if (reason.toLowerCase().includes('websocket')) {
      event.preventDefault();
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
