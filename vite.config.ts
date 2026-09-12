import { defineConfig } from 'vitest/config';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// This code runs in Node only. Never expose the bridge secret through VITE_*.
let bridgeSecret = '';
let configuredBackend = '';
try {
  const serverEnv = readFileSync('.env.server', 'utf8');
  bridgeSecret = process.env.DEMO_ACCESS_TOKEN || serverEnv.match(/^DEMO_ACCESS_TOKEN=(.+)$/m)?.[1]?.trim() || '';
  configuredBackend = serverEnv.match(/^REACTOR_BACKEND_URL=(.+)$/m)?.[1]?.trim() ?? '';
} catch { /* The local scene remains available without provider setup. */ }
const proxy = { '/api': {
  target: process.env.REACTOR_BACKEND_URL || configuredBackend || 'http://127.0.0.1:8787',
  changeOrigin: true,
  headers: { 'X-Demo-Access': bridgeSecret },
} };
const wasmFiles = ['reactor_wasm.js', 'reactor_wasm_bg.wasm'];
const wasmSource = (name: string) => readFileSync(resolve('node_modules/@reactor-team/js-sdk/dist/wasm', name));

export default defineConfig({
  base: './',
  // The published SDK deliberately ignores Vite for its relative WASM import.
  // Serve/copy its two existing artifacts; no new WASM toolchain is introduced.
  plugins: [{
    name: 'reactor-published-wasm',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const path = request.url?.split('?')[0];
        const name = wasmFiles.find(file => path === `/node_modules/.vite/deps/wasm/${file}` || path === `/assets/wasm/${file}`);
        if (!name) return next();
        response.setHeader('Content-Type', name.endsWith('.wasm') ? 'application/wasm' : 'text/javascript');
        response.end(wasmSource(name));
      });
    },
    generateBundle() {
      for (const name of wasmFiles) this.emitFile({ type: 'asset', fileName: `assets/wasm/${name}`, source: wasmSource(name) });
    },
  }],
  server: { proxy },
  preview: { proxy },
  test: { include: ['tests/**/*.test.ts'] },
  build: { outDir: 'build/relativity-candidate', emptyOutDir: true },
});
