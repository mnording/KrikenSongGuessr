import react from '@vitejs/plugin-react'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import { defineConfig } from 'vite'

// Källkartor laddas upp till Sentry bara när SENTRY_AUTH_TOKEN finns (i bygget före deploy),
// och raderas sedan ur dist så att de aldrig hamnar på webbplatsen.
const sentry = process.env.SENTRY_AUTH_TOKEN
  ? sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      sourcemaps: { filesToDeleteAfterUpload: ['./dist/**/*.map'] },
      telemetry: false,
    })
  : null

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), sentry],
  build: { sourcemap: sentry ? 'hidden' : false },
  // Tunneln under utveckling. Spotify godkänner bara HTTPS eller 127.0.0.1 som redirect.
  server: { host: '127.0.0.1', allowedHosts: ['.ngrok-free.dev', '.ngrok-free.app'] },
})
