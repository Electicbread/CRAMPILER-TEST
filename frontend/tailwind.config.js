/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // CSS-variable-backed so `dark:` and the `.dark` class can swap
        // these, while keeping opacity modifiers like `text-ink/60` working.
        ink: 'rgb(var(--color-ink) / <alpha-value>)',
        paper: 'rgb(var(--color-paper) / <alpha-value>)',
        panel: 'rgb(var(--color-panel) / <alpha-value>)',
        line: 'rgb(var(--color-line) / <alpha-value>)',
        forest: 'rgb(var(--color-forest) / <alpha-value>)',
        amber: 'rgb(var(--color-amber) / <alpha-value>)',
        critical: 'rgb(var(--color-critical) / <alpha-value>)',
        // Static scrim for modal backdrops — always dark, in both themes.
        // Never swap this for `ink`: ink becomes light text in dark mode,
        // which would turn backdrops into a pale haze instead of a dim.
        overlay: 'rgb(20 15 10 / <alpha-value>)',
      },
      fontFamily: {
        serif: ['"Source Serif 4"', 'Georgia', 'serif'],
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}