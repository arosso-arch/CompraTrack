import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, 'src') },
  },
  server: {
    port: 5173,
    // En desarrollo, /api se reenvía a la API .NET: el navegador ve un solo origen y no hace falta CORS.
    proxy: { '/api': 'http://localhost:5137' },
  },
})
