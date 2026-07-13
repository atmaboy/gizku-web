import type { Config } from 'tailwindcss'
const config: Config = {
  darkMode: ['class'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './public/**/*.html'],
  theme: {
    extend: {
      colors: {
        // Raw scales
        green: {
          50: 'var(--green-50)', 100: 'var(--green-100)', 200: 'var(--green-200)',
          300: 'var(--green-300)', 400: 'var(--green-400)', 500: 'var(--green-500)',
          600: 'var(--green-600)', 700: 'var(--green-700)', 800: 'var(--green-800)', 900: 'var(--green-900)',
        },
        sand: {
          25: 'var(--sand-25)', 50: 'var(--sand-50)', 100: 'var(--sand-100)',
          200: 'var(--sand-200)', 300: 'var(--sand-300)', 400: 'var(--sand-400)',
        },
        clay: { 500: 'var(--clay-500)', 600: 'var(--clay-600)' },
        bark: { 700: 'var(--bark-700)', 800: 'var(--bark-800)', 900: 'var(--bark-900)' },
        // Semantic aliases
        page: 'var(--color-bg-page)',
        surface: 'var(--color-bg-surface)',
        sunken: 'var(--color-bg-sunken)',
        muted: 'var(--color-bg-muted)',
        brand: {
          DEFAULT: 'var(--color-bg-brand)',
          hover: 'var(--color-bg-brand-hover)',
          tint: 'var(--color-bg-brand-tint)',
        },
        inverse: 'var(--color-bg-inverse)',
        dialog: 'var(--color-bg-dialog)',
        scrim: 'var(--color-bg-scrim)',
        primary: 'var(--color-text-primary)',
        secondary: 'var(--color-text-secondary)',
        tertiary: 'var(--color-text-tertiary)',
        onbrand: 'var(--color-text-onbrand)',
        link: 'var(--color-text-link)',
        border: {
          DEFAULT: 'var(--color-border-default)',
          strong: 'var(--color-border-strong)',
          brand: 'var(--color-border-brand)',
        },
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        danger: 'var(--color-danger)',
        kcal: 'var(--color-kcal)',
        protein: 'var(--color-protein)',
        carbs: 'var(--color-carbs)',
        fat: 'var(--color-fat)',
        tg: 'var(--tg-blue)',
      },
      fontSize: {
        '2xs': 'var(--text-2xs)',
        xs: 'var(--text-xs)',
        sm: 'var(--text-sm)',
        base: 'var(--text-base)',
        md: 'var(--text-md)',
        lg: 'var(--text-lg)',
        xl: 'var(--text-xl)',
        '2xl': 'var(--text-2xl)',
        '3xl': 'var(--text-3xl)',
      },
      borderRadius: {
        xs: 'var(--radius-xs)',
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
        pill: 'var(--radius-pill)',
      },
      boxShadow: {
        hairline: 'var(--shadow-hairline)',
        'hairline-strong': 'var(--shadow-hairline-strong)',
        xs: 'var(--shadow-xs)',
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
