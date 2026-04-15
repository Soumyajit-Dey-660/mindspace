import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  // VITE_API_URL is set in Vercel environment variables to the Render backend URL.
  // In dev it's empty so relative /api paths go through the proxy above.
  define: {
    __API_BASE__: JSON.stringify(process.env.VITE_API_URL ?? ''),
  },
})
