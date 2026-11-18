import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Load env from the repo root, where VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
  // live alongside the server-only keys. Vite still only exposes VITE_-prefixed
  // vars to the browser, so SERVICE_ROLE_KEY / DB_PASSWORD never reach the bundle.
  envDir: path.resolve(__dirname, '..'),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
