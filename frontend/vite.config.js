import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Reminder: VITE_-prefixed env vars are compiled into the bundle at build time, not read at
// runtime -- changing one in Netlify's dashboard requires a real rebuild to take effect, not
// just a redeploy of the existing build output.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
  },
});
