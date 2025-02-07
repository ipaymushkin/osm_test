import { viteStaticCopy } from 'vite-plugin-static-copy'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default {
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: 'static',
          dest: './'
        }
      ]
    })
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        example1: resolve(__dirname, 'example1.html'),
        example2: resolve(__dirname, 'example2.html'),
        example3: resolve(__dirname, 'example3.html'),
        example4: resolve(__dirname, 'example4.html'),
        example5: resolve(__dirname, 'example5.html'),
      }
    },
    sourcemap: true,
  }
}