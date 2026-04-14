import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  server: {
    proxy: {
      '/dart': {
        target: 'http://localhost:18080', // 로컬 API 서버 주소
        changeOrigin: true,
        rewrite: path => path.replace(/^\/dart/, '/dart'),
      },
      '/ml': {
        target: 'http://localhost:18081', // ML 주가예측 서비스
        changeOrigin: true,
        rewrite: path => path.replace(/^\/ml/, ''),
      },
    },
  }

})
