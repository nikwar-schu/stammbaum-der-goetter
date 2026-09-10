import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App.tsx';
import './ui/styles.css';

const container = document.getElementById('root');
if (container === null) {
  throw new Error('Das Wurzelelement #root fehlt in index.html');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
