import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // In dev, /api calls go to the Express server, so cookies stay same-origin.
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
});
