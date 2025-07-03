import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { triggerAdminSetup } from './utils/setupAdmin';

// Expose admin setup function to global scope for manual triggering
if (import.meta.env.DEV) {
  (window as any).setupAdmin = triggerAdminSetup;
  console.log('🔧 Development mode detected');
  console.log('📝 Admin credentials: admin@fbms.com / Qweasd145698@');
  console.log('⚡ To manually create admin account, run: setupAdmin()');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
