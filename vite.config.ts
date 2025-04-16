import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    host: true,
    port: 5174,
    hmr: {
      // For Replit compatibility
      clientPort: 443,
    },
  },
  preview: {
    host: true,
    port: 5174,
  },
  // Ensure proper base path for assets in production
  base: './',
});
