// src/net/quiplash-net-entry.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css'; // tokens (somente importado, nunca editado)
import { QuiplashNetApp } from './QuiplashNetApp';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div className="min-h-dvh bg-bg text-ink">
      <QuiplashNetApp />
    </div>
  </StrictMode>,
);
