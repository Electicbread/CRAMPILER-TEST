import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Proxies /api requests to the Spring Boot backend during local dev,
// so the client code can just call fetch('/api/...') with no CORS setup.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
