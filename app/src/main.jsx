import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);

if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !/localhost|127\.0\.0\.1/.test(location.hostname)) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
