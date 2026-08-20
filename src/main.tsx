import { registerSW } from 'virtual:pwa-register';
try { registerSW({ immediate: true }); } catch (e) { console.error('PWA Registration failed', e); }
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
