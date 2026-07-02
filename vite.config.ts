import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [
    vue(),
    ...(command === 'serve' ? [vueDevTools()] : []),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('/vue/') || id.includes('/pinia/') || id.includes('/vue-router/')) {
              return 'vue'
            }
            if (id.includes('/@headlessui/') || id.includes('/@heroicons/')) {
              return 'ui'
            }
            if (id.includes('/axios/')) {
              return 'http'
            }
          }
          return undefined
        },
      },
    },
  },
}))
