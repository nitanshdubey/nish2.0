/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{ts,tsx}'],
    theme: {
      extend: {
        colors: {
          base: 'rgb(var(--base) / <alpha-value>)',
          base2: 'rgb(var(--base2) / <alpha-value>)',
          panel: 'rgb(var(--panel) / <alpha-value>)',
          line: 'rgb(var(--line) / <alpha-value>)',
          ink: 'rgb(var(--ink) / <alpha-value>)',
          mute: 'rgb(var(--mute) / <alpha-value>)',
          accent: 'rgb(var(--accent) / <alpha-value>)',
          accent2: 'rgb(var(--accent2) / <alpha-value>)',
        },
        fontFamily: {
          display: ['Orbitron', 'Eurostile', 'system-ui', 'sans-serif'],
          sans: ['Inter', 'system-ui', 'Segoe UI', 'sans-serif'],
          mono: ['"JetBrains Mono"', 'ui-monospace', 'Consolas', 'monospace'],
        },
        boxShadow: {
          glow: '0 0 24px -4px rgb(var(--accent) / 0.45)',
          panel: '0 12px 40px -24px rgb(0 0 0 / 0.65)',
        },
      },
    },
    plugins: [],
  };