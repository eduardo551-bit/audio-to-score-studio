import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const isGitHubActions = process.env.GITHUB_ACTIONS === 'true'
const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1]

export default defineConfig({
  plugins: [react()],
  base: isGitHubActions && repositoryName ? `/${repositoryName}/` : '/',
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('scheduler')) return 'react-vendor'
            if (id.includes('opensheetmusicdisplay') || id.includes('vexflow')) return 'score-vendor'
            if (id.includes('@spotify/basic-pitch') || id.includes('pitchfinder')) return 'audio-vendor'
            if (id.includes('jspdf') || id.includes('html2canvas')) return 'export-vendor'
          }
        },
      },
    },
  },
})
