import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/pdfeditor/',
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    include: ['pdfjs-dist'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'pdf-libs': ['pdfjs-dist', 'pdf-lib'],
          fabric: ['fabric'],
          vendor: ['react', 'react-dom', 'zustand'],
        },
      },
    },
  },
})
