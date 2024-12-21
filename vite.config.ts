import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import VueMacros from 'unplugin-vue-macros/vite';
import Vue from '@vitejs/plugin-vue';
import webfontDownload from 'vite-plugin-webfont-dl';
import injectHTML from 'vite-plugin-html-inject';

const root = resolve(__dirname);
const srcDir = resolve(root, 'src');

// https://vitejs.dev/config/
export default defineConfig({
  root: srcDir,
  base: '/ac-observator/',
  publicDir: resolve(root, 'public'),
  envDir: root,
  plugins: [
    VueMacros({
      plugins: {
        vue: Vue({
          script: {
            defineModel: true,
          },
          features: {
            propsDestructure: true,
          },
        }),
      },
    }),
    webfontDownload(),
    injectHTML(),
  ],
  resolve: {
    alias: [{ find: '@', replacement: srcDir }],
  },
  css: {
    devSourcemap: true,
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
      },
    },
  },
  build: {
    outDir: resolve(root, 'docs'),
    rollupOptions: {
      input: {
        '': resolve(srcDir, 'index.html'),
      },
      output: {
        chunkFileNames: 'assets/ac_observator_dashboard-[name]-[hash].js',
      },
    },
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: true,
    fs: {
      cachedChecks: false,
    },
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
});
