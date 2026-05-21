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
      name: 'copy-manifest',
      closeBundle() {
        copyFileSync('manifest.json', 'dist/manifest.json')
      },
    },
  ],
})
