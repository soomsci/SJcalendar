import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    // Cargo writes and locks Windows executables here while compiling.
    // Rust changes are watched by Tauri, so Vite should ignore this tree.
    watch: { ignored: ['**/src-tauri/**'] },
  },
});
