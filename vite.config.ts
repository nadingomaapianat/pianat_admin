import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Separate Pianat Admin app. Runs on its own port; points at the same backend
// (set VITE_API_URL in .env, default http://localhost:5040). Deploy this on a
// locked/internal host so the admin bundle never reaches customer browsers.
export default defineConfig({
  plugins: [react()],
  server: { port: 3100 },
});
