import { defineConfig } from 'vite'
// If you picked the "react-swc-ts" template:
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

// Adjust base if deploying to USERNAME.github.io/REPO/
export default defineConfig({
  base: '/concept-map/', // <- change to '/<REPO>/' or '/' for user/site root
  plugins: [react(), tailwindcss()],
})
