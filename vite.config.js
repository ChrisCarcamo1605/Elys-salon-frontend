import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: process.env.VITE_API_BASE_URL?.replace('/api', '') || 'https://elysalon.shop/api',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
  preview: {
    host: '0.0.0.0',
    port: parseInt(process.env.PORT) || 4173,
    allowedHosts: ['elysalon.shop', 'react-frontend-dev-c187.up.railway.app'],

  },
  
})
