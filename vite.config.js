import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  optimizeDeps: {
    exclude: ['sql.js']
  },
  server: {
    fs: {
      allow: ['..']
    }
  }
})
