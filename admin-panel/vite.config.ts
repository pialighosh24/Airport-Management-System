import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// AeroNexus Admin Panel — standalone web admin (does NOT affect the Expo app)
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
});
