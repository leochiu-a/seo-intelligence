/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        pink: 'var(--color-pink)',
        dark: 'var(--color-dark)',
        ink: 'var(--color-ink)',
        secondary: 'var(--color-secondary)',
        'muted-fg': 'var(--color-muted-fg)',
        placeholder: 'var(--color-placeholder)',
        border: 'var(--color-border)',
        disabled: 'var(--color-disabled)',
        surface: 'var(--color-surface)',
        canvas: 'var(--color-canvas)',
        'tier-high': 'var(--color-tier-high)',
        'tier-mid': 'var(--color-tier-mid)',
        'tier-low': 'var(--color-tier-low)',
        'tier-neutral': 'var(--color-tier-neutral)',
      },
    },
  },
  plugins: [],
}
