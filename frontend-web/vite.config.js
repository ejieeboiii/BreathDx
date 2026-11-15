import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Keep this host in sync with the ESP32 sketch's API_URL.
const backendTarget = 'http://10.0.0.33:8001'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/auth': { target: backendTarget, changeOrigin: true },
      '/patients': { target: backendTarget, changeOrigin: true },
      '/readings': { target: backendTarget, changeOrigin: true, ws: true },
      '/health': { target: backendTarget, changeOrigin: true },
    },
  },
})
