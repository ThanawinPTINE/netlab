import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const resolve = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// Multi-page build: every top-level page and every lab page is its own HTML
// entry, mirroring the original public/ URL structure 1:1 (NETLab_Flow chose
// this over a React-Router SPA to keep every existing URL, bookmark and the
// nginx `root`-serves-static-files deployment model working unchanged).
export default defineConfig({
  plugins: [react()],
  server: {
    // Forward API calls to the FastAPI backend during dev, same split
    // lib/api.ts's API_BASE already encodes for non-dev deployments.
    proxy: {
      '/api': { target: 'http://localhost:8000', changeOrigin: true, rewrite: (p) => p.replace(/^\/api/, '') },
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve('./index.html'),
        login: resolve('./login.html'),
        profile: resolve('./profile.html'),
        labs: resolve('./labs.html'),
        course: resolve('./course.html'),
        dashboard: resolve('./dashboard.html'),
        lab1: resolve('./labnetwork1/lab01-course-intro/lab1.html'),
        lab2: resolve('./labnetwork1/lab02-cable-termination/lab2.html'),
        lab3: resolve('./labnetwork1/lab03-ip-subnetting/lab3.html'),
        lab4: resolve('./labnetwork1/lab04-basic-configuration/lab4.html'),
        lab5: resolve('./labnetwork1/lab05-static-route/lab5.html'),
        lab6: resolve('./labnetwork1/lab06-rip-v1/lab6.html'),
        lab7: resolve('./labnetwork1/lab07-rip-v2/lab7.html'),
        lab8: resolve('./labnetwork1/lab08-eigrp/lab8.html'),
        lab9: resolve('./labnetwork1/lab09-ospf/lab9.html'),
        lab10: resolve('./labnetwork1/lab10-redistribution/lab10.html'),
        lab11: resolve('./labnetwork1/lab11-bgp/lab11.html'),
      },
    },
  },
});
