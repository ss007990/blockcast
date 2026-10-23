import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import { applyShareLink, listenForAppLinks } from './services/share';
import './theme/global.css';

registerSW({ immediate: true });
applyShareLink();
void listenForAppLinks();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
