import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { localAiPlugin } from './server/ai.js'

export default defineConfig(({ mode }) => {
 const env = loadEnv(mode, process.cwd(), '')
 return {
  plugins: [vue(), localAiPlugin({ key: env.MOMA_API_KEY, model: env.MOMA_MODEL || 'DeepSeek-V4-Flash' })],
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
