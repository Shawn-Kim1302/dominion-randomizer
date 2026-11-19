import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// GitHub Pages serves the site under /<repo-name>/.
export default defineConfig({
  base: '/dominion-randomizer/',
  plugins: [vue()],
})
