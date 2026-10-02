import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    plugins: [svelte(), viteSingleFile()],
    resolve: {
        alias: {
            $components: resolve(rootDir, './src/components'),
            $pages: resolve(rootDir, './src/pages'),
            $lib: resolve(rootDir, './src/lib')
        }
    },
    root: './',
    build: {
        outDir: 'dist'
    },
    publicDir: 'static'
});
