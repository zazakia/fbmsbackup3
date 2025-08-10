import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
// Admin setup is disabled for security - removed global exposure
if (import.meta.env.DEV) {
  console.log('🔧 Development mode detected');
  console.log('🔒 Admin setup is disabled for security');
  console.log('📝 Use proper user registration and database role assignment');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
