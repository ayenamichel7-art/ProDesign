import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api/auth': 'http://localhost:8080',
      '/api': 'http://localhost:8080',
      '/outputs': 'http://localhost:8080',
      '/assets': 'http://localhost:8080',
      '/video': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        ws: true,
        rewrite: (path) => path.replace(/^\/video/, '')
      }
    }
  }
})
