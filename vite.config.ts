import { defineConfig } from 'vite'
import { resolve } from 'path'
import { copyFileSync } from 'fs'

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, 'src/content.ts'),
      output: {
        format: 'iife',       // single self-contained file, no module system needed
        entryFileNames: 'content.js',
        assetFileNames: '[name][extname]', // hints.css → content.css
      },
    },
  },
  plugins: [
    {
      name: 'copy-manifest',
      closeBundle() {
        copyFileSync('manifest.json', 'dist/manifest.json')
      },
    },
  ],
})
