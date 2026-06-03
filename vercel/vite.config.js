import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const manualChunks = id => {
  if (!id.includes('node_modules')) return undefined;
  if (id.includes('firebase')) return 'firebase';
  if (id.includes('recharts') || id.includes('d3-')) return 'charts';
  if (id.includes('framer-motion')) return 'motion';
  if (id.includes('@tanstack')) return 'table';
  if (id.includes('react') || id.includes('react-dom')) return 'react';
  return 'vendor';
};

export default defineConfig({
  plugins: [react()],
  envPrefix: ['VITE_', 'REACT_APP_'],
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
  },
});
