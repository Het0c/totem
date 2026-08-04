import type { Config } from 'tailwindcss';

export default { content: ['./index.html', './src/**/*.{ts,tsx}'], theme: { extend: { boxShadow: { glow: '0 0 30px rgba(34, 211, 238, 0.18)' } } }, plugins: [] } satisfies Config;
