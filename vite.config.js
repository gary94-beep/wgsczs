import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(() => {
 return {
  plugins: [vue()],
  base: '/apph5_test/wgsczs/',
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/handle2-api': {
        target: 'https://gd.10086.cn',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/handle2-api/, '/apph5/openapi/app/handle2'),
        headers: {
          Referer: 'https://gd.10086.cn/'
        }
      }
    }
  }
 } })
