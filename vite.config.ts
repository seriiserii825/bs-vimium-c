import { defineConfig } from 'vite'
import { resolve } from 'path'
import { copyFileSync } from 'fs'
import { build as esbuild } from 'esbuild'

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, 'src/content.ts'),
      output: {
        format: 'iife',
        entryFileNames: 'content.js',
        assetFileNames: '[name][extname]',
      },
    },
  },
  plugins: [
    {
      // Parse maps.csv at build time → JS array, no runtime parsing needed
      name: 'csv-transform',
      transform(src, id) {
        if (!id.endsWith('.csv')) return null
        const [, ...rows] = src.trim().split('\n') // skip header line
        const data = rows
          .filter(r => r.trim())
          .map(row => {
            const [hotkey, action, description] = row.split(',').map(s => s.trim())
            return { hotkey, action, description }
          })
        return { code: `export default ${JSON.stringify(data)}`, map: null }
      },
    },
    {
      name: 'build-background',
      async closeBundle() {
        await esbuild({
          entryPoints: ['src/background.ts', 'src/picker.ts'],
          bundle: true,
          outdir: 'dist',
          format: 'iife',
          platform: 'browser',
        })
      },
    },
    {
      name: 'copy-manifest',
      closeBundle() {
        copyFileSync('manifest.json', 'dist/manifest.json')
        copyFileSync('src/picker.html', 'dist/picker.html')
      },
    },
  ],
})
