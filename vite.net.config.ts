// Build standalone do app multiplayer (Quiplash em rede), separado do build de
// produção do app principal (vite.config.ts é território do Chat A). Gera um
// dist-net/ que o `partykit deploy --serve dist-net` publica junto com o room
// server, na mesma origem. O host do room server entra via VITE_PARTYKIT_HOST
// no momento do build (mesmo env var que o cliente lê em runtime).
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist-net',
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(import.meta.dirname, 'quiplash-net.html'),
    },
  },
});
