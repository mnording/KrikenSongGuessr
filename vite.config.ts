import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Tunneln under utveckling. Spotify godkänner bara HTTPS eller 127.0.0.1 som redirect.
  server: { host: '127.0.0.1', allowedHosts: ['.ngrok-free.dev', '.ngrok-free.app'] },
})
