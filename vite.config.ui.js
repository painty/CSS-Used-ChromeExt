import { resolve } from 'path'
import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  plugins: [svelte()],
  esbuild: {
    charset: 'ascii',
  },
  build: {
    target: 'es2020',
    copyPublicDir: true,
    emptyOutDir: true,
    rollupOptions: {
      input: {
        panel: resolve(__dirname, 'src/panel.html'),
        options: resolve(__dirname, 'src/options.html'),
      }
    },
  },
})
