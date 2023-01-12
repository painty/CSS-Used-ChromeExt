import { resolve } from "path";
import { defineConfig } from "vite";
import EnvironmentPlugin from 'vite-plugin-environment'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  plugins: [
    EnvironmentPlugin([
      'NODE_ENV',
      'LANG'
    ]),
    svelte()
  ],
  esbuild:{
    charset:"ascii"
  },
  build: {
    target: 'es2020',
    copyPublicDir:false,
    emptyOutDir:false,
    outDir:'./build/asset/js/',
    lib: {
      // Could also be a dictionary or array of multiple entry points
      entry: resolve(__dirname, "src/main.ts"),
      name: "getCssUsed",
      // the proper extensions will be added
      formats: ["umd"],
      fileName: (format, entryName)=>{
        return 'content.js'
      }
    },
    minify : false,
    rollupOptions: {
      input: {
        panel: resolve(__dirname, 'panel.html'),
        options: resolve(__dirname, 'options.html'),
      },
    },
  },
});
