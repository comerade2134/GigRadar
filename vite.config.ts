import { defineConfig } from 'vite'
import { crx } from '@crxjs/vite-plugin'
import { fileURLToPath } from 'node:url'
import manifest from './manifest.json'

export default defineConfig({
  plugins: [crx({ manifest })],
  resolve: {
    alias: {
      'webextension-polyfill': fileURLToPath(
        new URL('./src/vendor/webextension-polyfill.ts', import.meta.url)
      )
    }
  },
  server: {
    port: 5173,
    strictPort: true,
    hmr: { port: 5174 }
  },
  build: {
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('extpay.module') || id.includes('webextension-polyfill')) {
            return 'extpay-vendor'
          }
        }
      }
    }
  }
})
