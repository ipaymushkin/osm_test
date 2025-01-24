import { viteStaticCopy } from 'vite-plugin-static-copy'

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
    sourcemap: true,
  }
}