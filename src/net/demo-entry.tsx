// src/net/demo-entry.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css'; // tokens (somente importado, nunca editado)
import { NetDemoApp } from './NetDemoApp';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div className="min-h-dvh bg-bg text-ink">
      <NetDemoApp />
    </div>
  </StrictMode>,
);
